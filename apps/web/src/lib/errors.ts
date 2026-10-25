import { ApiError } from "@preppilot/shared";

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function hasErrorCode(error: unknown, code: string): boolean {
  return isApiError(error) && error.code === code;
}

export const isAiKeyMissing = (error: unknown) => hasErrorCode(error, "AI_KEY_MISSING");
export const isNotFound = (error: unknown) => hasErrorCode(error, "NOT_FOUND");

/** A human-friendly message for any thrown value. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isApiError(error)) {
    switch (error.code) {
      case "NETWORK_ERROR":
        return "Could not reach the PrepPilot server. Check your connection and try again.";
      case "RATE_LIMITED":
        return "You're going a little fast — please wait a moment and try again.";
      case "AI_ERROR":
        return error.message || "The AI service had a problem generating this. Please try again.";
      case "AI_KEY_MISSING":
        return "AI features aren't configured yet. Add your Anthropic API key in Settings.";
      case "UNAUTHORIZED":
        return "Your session has expired. Please sign in again.";
      default:
        return error.message || fallback;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Field errors from a VALIDATION_ERROR response (keyed by dotted path). */
export function getFieldErrors(error: unknown): Record<string, string> {
  return isApiError(error) ? error.fieldErrors : {};
}

/** Don't retry deterministic client errors; do retry transient network/server failures a little. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isApiError(error)) {
    if (error.status === 0 || error.status >= 500) return failureCount < 2;
    return false;
  }
  return failureCount < 2;
}
