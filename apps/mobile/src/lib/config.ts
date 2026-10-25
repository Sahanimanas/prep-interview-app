import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const API_PATH = '/api/v1';
const API_PORT = 4000;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Resolves the API base URL:
 * 1. `EXPO_PUBLIC_API_URL` when set (recommended — use your machine's LAN IP on a real device).
 * 2. Android emulator → `10.0.2.2` (the host machine's loopback).
 * 3. Physical device in development → the Metro dev-server host (same machine that runs the API).
 * 4. Fallback → `localhost`.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) return stripTrailingSlash(fromEnv.trim());

  if (Platform.OS === 'android' && !Device.isDevice) {
    return `http://10.0.2.2:${API_PORT}${API_PATH}`;
  }

  if (__DEV__ && Device.isDevice && Platform.OS !== 'web') {
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.10:8081"
    const host = hostUri?.split(':')[0];
    if (host) return `http://${host}:${API_PORT}${API_PATH}`;
  }

  return `http://localhost:${API_PORT}${API_PATH}`;
}

export const API_URL = resolveApiUrl();

/** Polling cadence for async AI jobs. */
export const POLL_INTERVAL_MS = 3000;
