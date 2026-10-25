/**
 * Thin wrapper around the Anthropic SDK: one streamed, structured-output request per call,
 * with SDK errors mapped to AppErrors. Only used for real (non-mock) calls.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import type { AiContext } from './types';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface StructuredRequest<T> {
  ctx: AiContext;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  effort: Effort;
  maxTokens: number;
  /** Short task name for logs, e.g. 'plan'. */
  task: string;
}

// ---------------------------------------------------------------------------
// Client cache (one client per API key, small LRU)
// ---------------------------------------------------------------------------

const MAX_CLIENTS = 50;
const clients = new Map<string, Anthropic>();

export function createClient(apiKey: string, opts: { maxRetries?: number; timeout?: number } = {}): Anthropic {
  return new Anthropic({ apiKey, maxRetries: opts.maxRetries ?? 2, timeout: opts.timeout ?? 10 * 60 * 1000 });
}

function getClient(apiKey: string): Anthropic {
  const cached = clients.get(apiKey);
  if (cached) {
    // Refresh recency.
    clients.delete(apiKey);
    clients.set(apiKey, cached);
    return cached;
  }
  const client = createClient(apiKey);
  clients.set(apiKey, client);
  while (clients.size > MAX_CLIENTS) {
    const oldest = clients.keys().next().value;
    if (oldest === undefined) break;
    clients.delete(oldest);
  }
  return client;
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

export function isAbortError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (err instanceof Anthropic.APIUserAbortError) return true;
  return err instanceof Error && err.name === 'AbortError';
}

/** Maps SDK errors to AppErrors. Abort errors and AppErrors are returned untouched. */
export function mapAnthropicError(err: unknown, task: string, signal?: AbortSignal): unknown {
  if (err instanceof AppError || isAbortError(err, signal)) return err;

  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AppError(
      400,
      'AI_KEY_INVALID',
      'The Anthropic API key was rejected. Check that it is correct and has access to the model, then update it in Settings.',
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AppError(
      429,
      'RATE_LIMITED',
      'The Anthropic API rate limit was reached. Please wait a minute and try again.',
      undefined,
      true,
    );
  }
  if (err instanceof Anthropic.BadRequestError) {
    logger.error({ task, status: err.status, requestId: err.requestID, error: err.error }, 'ai request rejected');
    return new AppError(502, 'AI_ERROR', 'The AI service rejected the request. Please try again later.');
  }
  if (err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.InternalServerError) {
    logger.warn({ task, err: err.message }, 'ai service unavailable');
    return new AppError(502, 'AI_ERROR', 'The AI service is temporarily unavailable. Please try again shortly.', undefined, true);
  }
  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    const retryable = status === undefined || status >= 500;
    logger.warn({ task, status, requestId: err.requestID, error: err.error }, 'ai request failed');
    return retryable
      ? new AppError(502, 'AI_ERROR', 'The AI service is temporarily unavailable. Please try again shortly.', undefined, true)
      : new AppError(502, 'AI_ERROR', 'The AI request failed. Please try again later.');
  }
  if (err instanceof Anthropic.AnthropicError) {
    // e.g. the stream ended without any chunks.
    logger.warn({ task, err: err.message }, 'ai stream failed');
    return new AppError(502, 'AI_ERROR', 'The AI response was interrupted. Please try again.', undefined, true);
  }
  return err;
}

// ---------------------------------------------------------------------------
// Output extraction
// ---------------------------------------------------------------------------

type ContentBlock = { type: string; text?: string };

/**
 * Candidate JSON texts, most likely first. With server-side fallback a mid-stream decline keeps
 * the partial text and the fallback model continues it, so the full output is normally the
 * concatenation of all text blocks; the text after the last `fallback` block is tried as well.
 */
function candidateTexts(content: readonly ContentBlock[]): string[] {
  const textOf = (blocks: readonly ContentBlock[]) =>
    blocks
      .filter((b) => b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('');
  const all = textOf(content);
  const lastFallback = content.map((b) => b.type).lastIndexOf('fallback');
  const afterFallback = lastFallback >= 0 ? textOf(content.slice(lastFallback + 1)) : '';
  return [...new Set([all, afterFallback].filter((t) => t.trim().length > 0))];
}

function parseOutput<T>(schema: z.ZodType<T>, content: readonly ContentBlock[], task: string): T {
  let lastIssue: unknown = 'no text output';
  for (const text of candidateTexts(content)) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e) {
      lastIssue = e instanceof Error ? e.message : String(e);
      continue;
    }
    const result = schema.safeParse(json);
    if (result.success) return result.data;
    lastIssue = result.error.issues.slice(0, 5);
  }
  logger.warn({ task, issue: lastIssue }, 'ai output did not match schema');
  throw new AppError(502, 'AI_ERROR', 'The AI returned an unexpected response. Please try again.', undefined, true);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateStructured<T>(req: StructuredRequest<T>): Promise<T> {
  const { ctx, schema, system, prompt, effort, maxTokens, task } = req;
  if (env.AI_MOCK || ctx.apiKey === 'mock') {
    // The service routes mock calls to the mock provider; reaching this is a bug.
    throw new AppError(500, 'INTERNAL_ERROR', 'Real AI call attempted in mock mode');
  }

  const client = getClient(ctx.apiKey);
  // Use the SDK helper only to build the JSON schema; parsing is done here so that truncated or
  // refused output surfaces as a stop_reason instead of a parse exception inside the stream.
  const { parse: _parse, ...format } = betaZodOutputFormat(schema);
  const started = Date.now();

  let message;
  try {
    const stream = client.beta.messages.stream(
      {
        model: env.AI_MODEL,
        max_tokens: maxTokens,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort, format },
        system,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: ctx.signal },
    );
    message = await stream.finalMessage();
  } catch (err) {
    throw mapAnthropicError(err, task, ctx.signal);
  }

  const durationMs = Date.now() - started;
  const fellBack = (message.usage.iterations ?? []).some((i) => i.type === 'fallback_message');
  logger.info(
    {
      task,
      model: message.model,
      requestedModel: env.AI_MODEL,
      durationMs,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      stopReason: message.stop_reason,
      fellBack,
    },
    'ai call completed',
  );

  if (message.stop_reason === 'refusal') {
    logger.warn({ task, stopDetails: message.stop_details }, 'ai refused request');
    throw new AppError(
      502,
      'AI_ERROR',
      "The AI declined to generate this content. Try rephrasing your notes or answers, or choose a different topic.",
    );
  }
  if (message.stop_reason === 'max_tokens' || message.stop_reason === 'model_context_window_exceeded') {
    throw new AppError(
      502,
      'AI_ERROR',
      'The AI response was too long and got cut off. Try a shorter plan or fewer topics.',
    );
  }

  return parseOutput(schema, message.content, task);
}
