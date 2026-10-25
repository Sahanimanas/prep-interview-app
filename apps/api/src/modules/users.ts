import type { Me } from '@preppilot/shared';
import { env } from '../config/env';
import { query, queryOne, type Queryable } from '../db/pool';
import { AppError, notFound } from '../lib/errors';
import { decryptSecret } from '../lib/crypto';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  encrypted_api_key: string | null;
  api_key_hint: string | null;
  created_at: Date;
}

export function toMe(row: UserRow): Me {
  const hasApiKey = !!row.encrypted_api_key;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    hasApiKey,
    apiKeyHint: row.api_key_hint,
    aiAvailable: hasApiKey || !!env.ANTHROPIC_API_KEY || env.AI_MOCK,
  };
}

export async function findUserById(id: string, db?: Queryable): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id], db);
}

export async function getUserOrThrow(id: string): Promise<UserRow> {
  const user = await findUserById(id);
  if (!user) throw notFound('User');
  return user;
}

/**
 * Resolves which Anthropic key an AI call for this user should use:
 * the user's own key first, then the server key. 'mock' in AI_MOCK mode.
 */
export async function resolveApiKey(userId: string): Promise<string> {
  if (env.AI_MOCK) return 'mock';
  const rows = await query<{ encrypted_api_key: string | null }>(
    'SELECT encrypted_api_key FROM users WHERE id = $1',
    [userId],
  );
  const encrypted = rows[0]?.encrypted_api_key;
  if (encrypted) return decryptSecret(encrypted, env.ENCRYPTION_KEY);
  if (env.ANTHROPIC_API_KEY) return env.ANTHROPIC_API_KEY;
  throw new AppError(
    402,
    'AI_KEY_MISSING',
    'AI is not configured yet. Add your Anthropic API key in Settings to generate content.',
  );
}
