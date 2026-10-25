/**
 * The AI service used by routes and job handlers. Real calls go through `generateStructured`;
 * in AI_MOCK mode (or with the 'mock' context key) every method delegates to the mock provider.
 */
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { createClient, generateStructured, isAbortError } from './llm';
import { mockAi } from './mock-provider';
import {
  normalizeDoc,
  normalizeEvaluation,
  normalizeIntakeQuestions,
  normalizePlan,
  normalizeQuestions,
  normalizeQuiz,
  normalizeScorecard,
} from './normalize';
import {
  intakeQuestionsPrompt,
  learningDocPrompt,
  mockEvaluatePrompt,
  mockStartPrompt,
  planPrompt,
  questionsPrompt,
  quizPrompt,
  scorecardPrompt,
} from './prompts';
import {
  docOutput,
  intakeQuestionsOutput,
  mockEvaluationOutput,
  mockStartOutput,
  planOutput,
  questionsOutput,
  quizOutput,
  scorecardOutput,
} from './schemas';
import type { AiContext, AiService } from './types';

const useMock = (ctx: AiContext) => env.AI_MOCK || ctx.apiKey === 'mock';

/** Output budget for plans grows with length (thinking tokens count toward max_tokens too). */
export function planMaxTokens(totalDays: number): number {
  return Math.min(64000, 16000 + Math.max(1, totalDays) * 500);
}

const realAi: AiService = {
  async generateIntakeQuestions(ctx, basics) {
    const raw = await generateStructured({
      ctx,
      schema: intakeQuestionsOutput,
      ...intakeQuestionsPrompt(basics),
      effort: 'low',
      maxTokens: 4000,
      task: 'intake_questions',
    });
    return normalizeIntakeQuestions(raw);
  },

  async generatePlan(ctx, profile) {
    const raw = await generateStructured({
      ctx,
      schema: planOutput,
      ...planPrompt(profile),
      effort: 'medium',
      maxTokens: planMaxTokens(profile.totalDays),
      task: 'plan',
    });
    return normalizePlan(raw, profile.totalDays, `${profile.targetRole} · ${profile.totalDays}-day plan`);
  },

  async generateLearningDoc(ctx, profile, topic) {
    const raw = await generateStructured({
      ctx,
      schema: docOutput,
      ...learningDocPrompt(profile, topic),
      effort: 'medium',
      maxTokens: 16000,
      task: 'learning_doc',
    });
    return normalizeDoc(raw);
  },

  async generateQuestions(ctx, profile, topic) {
    const raw = await generateStructured({
      ctx,
      schema: questionsOutput,
      ...questionsPrompt(profile, topic),
      effort: 'medium',
      maxTokens: 16000,
      task: 'questions',
    });
    return normalizeQuestions(raw);
  },

  async generateQuiz(ctx, profile, topics, questionCount) {
    const raw = await generateStructured({
      ctx,
      schema: quizOutput,
      ...quizPrompt(profile, topics, questionCount),
      effort: 'low',
      maxTokens: 12000,
      task: 'quiz',
    });
    const fallbackTitle = topics.length === 1 ? `${topics[0]!.title} quiz` : 'Revision quiz';
    return normalizeQuiz(raw, questionCount, fallbackTitle);
  },

  async startMockInterview(ctx, profile, setup) {
    const raw = await generateStructured({
      ctx,
      schema: mockStartOutput,
      ...mockStartPrompt(profile, setup),
      effort: 'low',
      maxTokens: 4000,
      task: 'mock_start',
    });
    const message = raw.message.trim();
    if (!message) {
      throw new AppError(502, 'AI_ERROR', 'The AI returned an empty interviewer message. Please try again.', undefined, true);
    }
    return { message };
  },

  async evaluateMockAnswer(ctx, profile, setup, transcript, isLast) {
    const raw = await generateStructured({
      ctx,
      schema: mockEvaluationOutput,
      ...mockEvaluatePrompt(profile, setup, transcript, isLast),
      effort: 'low',
      maxTokens: 6000,
      task: 'mock_evaluate',
    });
    return normalizeEvaluation(raw, isLast);
  },

  async generateMockScorecard(ctx, profile, setup, transcript) {
    const raw = await generateStructured({
      ctx,
      schema: scorecardOutput,
      ...scorecardPrompt(profile, setup, transcript),
      effort: 'medium',
      maxTokens: 6000,
      task: 'mock_scorecard',
    });
    return normalizeScorecard(raw);
  },

  async validateApiKey(apiKey) {
    try {
      await createClient(apiKey, { maxRetries: 1, timeout: 20_000 }).models.list({ limit: 1 });
    } catch (err) {
      if (isAbortError(err)) throw err;
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        throw new AppError(400, 'AI_KEY_INVALID', 'Anthropic rejected this API key');
      }
      if (err instanceof Anthropic.RateLimitError) {
        // The key authenticated (rate limits apply only to valid keys).
        return;
      }
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'api key validation failed');
      throw new AppError(
        502,
        'AI_ERROR',
        'Could not reach Anthropic to verify the key. Please try again shortly.',
        undefined,
        true,
      );
    }
  },
};

export const ai: AiService = {
  generateIntakeQuestions: (ctx, basics) =>
    useMock(ctx) ? mockAi.generateIntakeQuestions(ctx, basics) : realAi.generateIntakeQuestions(ctx, basics),
  generatePlan: (ctx, profile) => (useMock(ctx) ? mockAi.generatePlan(ctx, profile) : realAi.generatePlan(ctx, profile)),
  generateLearningDoc: (ctx, profile, topic) =>
    useMock(ctx) ? mockAi.generateLearningDoc(ctx, profile, topic) : realAi.generateLearningDoc(ctx, profile, topic),
  generateQuestions: (ctx, profile, topic) =>
    useMock(ctx) ? mockAi.generateQuestions(ctx, profile, topic) : realAi.generateQuestions(ctx, profile, topic),
  generateQuiz: (ctx, profile, topics, count) =>
    useMock(ctx) ? mockAi.generateQuiz(ctx, profile, topics, count) : realAi.generateQuiz(ctx, profile, topics, count),
  startMockInterview: (ctx, profile, setup) =>
    useMock(ctx) ? mockAi.startMockInterview(ctx, profile, setup) : realAi.startMockInterview(ctx, profile, setup),
  evaluateMockAnswer: (ctx, profile, setup, transcript, isLast) =>
    useMock(ctx)
      ? mockAi.evaluateMockAnswer(ctx, profile, setup, transcript, isLast)
      : realAi.evaluateMockAnswer(ctx, profile, setup, transcript, isLast),
  generateMockScorecard: (ctx, profile, setup, transcript) =>
    useMock(ctx)
      ? mockAi.generateMockScorecard(ctx, profile, setup, transcript)
      : realAi.generateMockScorecard(ctx, profile, setup, transcript),
  validateApiKey: (apiKey) => (env.AI_MOCK ? mockAi.validateApiKey(apiKey) : realAi.validateApiKey(apiKey)),
};
