"use client";

import type { LoginInput, Me, RegisterInput } from "@preppilot/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, onSessionExpired } from "./api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: Me | null;
  login: (input: LoginInput) => Promise<Me>;
  register: (input: RegisterInput) => Promise<Me>;
  logout: () => Promise<void>;
  /** Replace the cached user (e.g. after updating the profile or API key). */
  setUser: (user: Me) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Restores the session once per page load: the refresh cookie is exchanged for an access
 * token, then the profile is fetched. Shared across StrictMode double-effects.
 */
let bootstrapPromise: Promise<Me | null> | null = null;
function bootstrapSession(): Promise<Me | null> {
  bootstrapPromise ??= (async () => {
    try {
      const refreshed = await api.refreshSession();
      if (!refreshed) return null;
      return await api.me();
    } catch {
      return null;
    }
  })();
  return bootstrapPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: AuthStatus; user: Me | null }>({
    status: "loading",
    user: null,
  });
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void bootstrapSession().then((user) => {
      if (cancelled) return;
      setState(user ? { status: "authenticated", user } : { status: "unauthenticated", user: null });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      bootstrapPromise = Promise.resolve(null);
      setState({ status: "unauthenticated", user: null });
      queryClient.clear();
      router.replace("/login?expired=1");
    });
  }, [queryClient, router]);

  const login = useCallback(async (input: LoginInput) => {
    const res = await api.login(input);
    bootstrapPromise = Promise.resolve(res.user);
    setState({ status: "authenticated", user: res.user });
    return res.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await api.register(input);
    bootstrapPromise = Promise.resolve(res.user);
    setState({ status: "authenticated", user: res.user });
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The local session is cleared regardless (ApiClient.logout clears storage in `finally`).
    }
    bootstrapPromise = Promise.resolve(null);
    setState({ status: "unauthenticated", user: null });
    queryClient.clear();
    router.replace("/");
  }, [queryClient, router]);

  const setUser = useCallback((user: Me) => {
    bootstrapPromise = Promise.resolve(user);
    setState({ status: "authenticated", user });
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await api.me();
    setUser(user);
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, setUser, refreshUser }),
    [state, login, register, logout, setUser, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/** The signed-in user. Only call below <RequireAuth>, where the user is guaranteed. */
export function useUser(): Me {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called without an authenticated user");
  return user;
}
