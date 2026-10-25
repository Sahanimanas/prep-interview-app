import type { AuthStorage } from '@preppilot/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'preppilot.accessToken';
const REFRESH_KEY = 'preppilot.refreshToken';

interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function webStorage(): WebStorageLike | null {
  try {
    return (globalThis as unknown as { localStorage?: WebStorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
}

/** Web has no keychain — fall back to localStorage (guarded: it can throw in private mode). */
const webStore: KeyValueStore = {
  async get(key) {
    try {
      return webStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      webStorage()?.setItem(key, value);
    } catch {
      // storage unavailable — session will only live in memory
    }
  },
  async remove(key) {
    try {
      webStorage()?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

const secureStore: KeyValueStore = {
  async get(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  },
  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

const store: KeyValueStore = Platform.OS === 'web' ? webStore : secureStore;

interface TokenCache {
  access: string | null;
  refresh: string | null;
}

/** In-memory mirror so every request doesn't hit the keychain. */
let cache: TokenCache | null = null;
let loading: Promise<TokenCache> | null = null;

function load(): Promise<TokenCache> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = Promise.all([store.get(ACCESS_KEY), store.get(REFRESH_KEY)])
      .then(([access, refresh]) => {
        // A save/clear may have happened while we were reading.
        cache ??= { access, refresh };
        return cache;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export const tokenStorage: AuthStorage = {
  async getAccessToken() {
    return (await load()).access;
  },
  async getRefreshToken() {
    return (await load()).refresh;
  },
  async save({ accessToken, refreshToken }) {
    const current = await load();
    const next: TokenCache = { access: accessToken, refresh: refreshToken ?? current.refresh };
    cache = next;
    await store.set(ACCESS_KEY, accessToken);
    if (refreshToken) await store.set(REFRESH_KEY, refreshToken);
  },
  async clear() {
    cache = { access: null, refresh: null };
    await Promise.all([store.remove(ACCESS_KEY), store.remove(REFRESH_KEY)]);
  },
};
