import { ApiClient, type AuthStorage } from "@preppilot/shared";

/**
 * Cookie-mode auth storage: the refresh token is an httpOnly cookie owned by the API,
 * so only the short-lived access token is kept — in memory, never in web storage.
 */
let accessToken: string | null = null;

const memoryStorage: AuthStorage = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => null,
  save: (tokens) => {
    accessToken = tokens.accessToken;
  },
  clear: () => {
    accessToken = null;
  },
};

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** Subscribe to "the session could not be refreshed" events. Returns an unsubscribe function. */
export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

/** Same-origin client; `/api/v1/*` is rewritten to the API by next.config.ts. */
export const api = new ApiClient({
  baseUrl: "/api/v1",
  mode: "cookie",
  storage: memoryStorage,
  onSessionExpired: () => {
    sessionExpiredListeners.forEach((listener) => listener());
  },
});
