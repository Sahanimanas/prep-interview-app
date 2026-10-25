import type { LoginInput, Me, RegisterInput } from '@preppilot/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setSessionExpiredListener } from '@/lib/api';
import { asApiError, isNetworkError } from '@/lib/errors';
import { queryKeys } from '@/lib/queries';
import { tokenStorage } from '@/lib/token-storage';

/**
 * - `loading`: reading stored tokens / validating the session on launch
 * - `unreachable`: we have a session but the server can't be reached (offer retry)
 */
export type AuthStatus = 'loading' | 'signedIn' | 'signedOut' | 'unreachable';

interface AuthContextValue {
  status: AuthStatus;
  signIn: (input: LoginInput) => Promise<Me>;
  signUp: (input: RegisterInput) => Promise<Me>;
  signOut: () => Promise<void>;
  /** Re-run the launch session check (used from the "can't reach server" screen). */
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  // Launch: if we have a refresh token, validate it via /me (the client refreshes on 401).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      try {
        const me = await api.me();
        if (cancelled) return;
        queryClient.setQueryData(queryKeys.me, me);
        setStatus('signedIn');
      } catch (error) {
        if (cancelled) return;
        const e = asApiError(error);
        if (isNetworkError(error) || (e && e.status >= 500)) {
          setStatus('unreachable');
        } else {
          await tokenStorage.clear();
          setStatus('signedOut');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, queryClient]);

  // An unrecoverable 401 anywhere in the app signs the user out.
  useEffect(() => {
    setSessionExpiredListener(() => {
      queryClient.clear();
      setStatus('signedOut');
    });
    return () => setSessionExpiredListener(null);
  }, [queryClient]);

  const signIn = useCallback(
    async (input: LoginInput) => {
      const res = await api.login(input);
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, res.user);
      setStatus('signedIn');
      return res.user;
    },
    [queryClient],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      const res = await api.register(input);
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, res.user);
      setStatus('signedIn');
      return res.user;
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Logging out must always succeed locally, even if the server is unreachable.
      await tokenStorage.clear();
    }
    queryClient.clear();
    setStatus('signedOut');
  }, [queryClient]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, signIn, signUp, signOut, retry }),
    [status, signIn, signUp, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
