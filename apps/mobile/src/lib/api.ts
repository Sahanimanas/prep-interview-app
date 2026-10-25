import { createApiClient } from '@preppilot/shared';

import { API_URL } from '@/lib/config';
import { tokenStorage } from '@/lib/token-storage';

type Listener = () => void;
let sessionExpiredListener: Listener | null = null;

/** The auth provider registers itself here so an unrecoverable 401 signs the user out. */
export function setSessionExpiredListener(listener: Listener | null): void {
  sessionExpiredListener = listener;
}

export const api = createApiClient({
  baseUrl: API_URL,
  storage: tokenStorage,
  mode: 'token',
  onSessionExpired: () => sessionExpiredListener?.(),
});
