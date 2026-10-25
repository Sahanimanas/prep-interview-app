import { ApiError } from '@preppilot/shared';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'AI_KEY_MISSING'
  | 'RATE_LIMITED'
  | 'AI_ERROR'
  | 'NETWORK_ERROR';

export function asApiError(error: unknown): ApiError | null {
  return error instanceof ApiError ? error : null;
}

export function hasErrorCode(error: unknown, code: ErrorCode): boolean {
  return asApiError(error)?.code === code;
}

export function isAiKeyMissing(error: unknown): boolean {
  return hasErrorCode(error, 'AI_KEY_MISSING');
}

export function isNetworkError(error: unknown): boolean {
  const e = asApiError(error);
  return !!e && (e.code === 'NETWORK_ERROR' || e.status === 0);
}

/** Friendly, user-facing message for any thrown value. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = asApiError(error);
  if (!e) return error instanceof Error && error.message ? error.message : fallback;
  switch (e.code) {
    case 'NETWORK_ERROR':
      return "Can't reach the PrepPilot server. Check your connection and try again.";
    case 'AI_KEY_MISSING':
      return 'AI features need an Anthropic API key. Add yours in Settings.';
    case 'RATE_LIMITED':
      return "You're going a little fast. Wait a moment and try again.";
    case 'AI_ERROR':
      return e.message || 'The AI had trouble with that request. Please try again.';
    case 'NOT_FOUND':
      return 'This item could not be found. It may have been deleted.';
    case 'UNAUTHORIZED':
      return 'Your session has expired. Please sign in again.';
    case 'VALIDATION_ERROR': {
      const first = Object.values(e.fieldErrors)[0];
      return first ?? e.message ?? fallback;
    }
    default:
      return e.message || fallback;
  }
}

/** Field errors from a VALIDATION_ERROR response, keyed by dotted path. */
export function getFieldErrors(error: unknown): Record<string, string> {
  return asApiError(error)?.fieldErrors ?? {};
}

interface IssueLike {
  path: readonly PropertyKey[];
  message: string;
}

/** Converts zod issues into a `{ "field.path": message }` map (first message wins). */
export function issuesToFieldErrors(issues: readonly IssueLike[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map((p) => String(p)).join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
