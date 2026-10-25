import { Router } from 'express';
import { setApiKeySchema, updateProfileSchema } from '@preppilot/shared';
import { ai } from '../ai/service';
import { env } from '../config/env';
import { queryOne } from '../db/pool';
import { encryptSecret } from '../lib/crypto';
import { notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { parse } from '../middleware/validate';
import { getUserOrThrow, toMe, type UserRow } from './users';

export const meRouter = Router();

meRouter.get('/', async (req, res) => {
  res.json(toMe(await getUserOrThrow(currentUserId(req))));
});

meRouter.patch('/', async (req, res) => {
  const input = parse(updateProfileSchema, req.body);
  const user = await queryOne<UserRow>('UPDATE users SET name = $2 WHERE id = $1 RETURNING *', [
    currentUserId(req),
    input.name,
  ]);
  if (!user) throw notFound('User');
  res.json(toMe(user));
});

meRouter.put('/api-key', async (req, res) => {
  const { apiKey } = parse(setApiKeySchema, req.body);
  await ai.validateApiKey(apiKey);
  const user = await queryOne<UserRow>(
    'UPDATE users SET encrypted_api_key = $2, api_key_hint = $3 WHERE id = $1 RETURNING *',
    [currentUserId(req), encryptSecret(apiKey, env.ENCRYPTION_KEY), apiKey.slice(-4)],
  );
  if (!user) throw notFound('User');
  res.json(toMe(user));
});

meRouter.delete('/api-key', async (req, res) => {
  const user = await queryOne<UserRow>(
    'UPDATE users SET encrypted_api_key = NULL, api_key_hint = NULL WHERE id = $1 RETURNING *',
    [currentUserId(req)],
  );
  if (!user) throw notFound('User');
  res.json(toMe(user));
});
