import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router, type Request, type Response } from 'express';
import { loginSchema, refreshSchema, registerSchema, type AuthResponse } from '@preppilot/shared';
import { env, isProduction } from '../config/env';
import { pgErrorCode, pool, query, queryOne, withTransaction, type Queryable } from '../db/pool';
import { randomToken, sha256 } from '../lib/crypto';
import { conflict, unauthorized } from '../lib/errors';
import { signAccessToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';
import { parse } from '../middleware/validate';
import { toMe, type UserRow } from './users';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE = 'pp_rt';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

const usesCookie = (req: Request) => req.get('x-auth-mode') === 'cookie';

async function issueRefreshToken(
  userId: string,
  familyId: string,
  userAgent: string | undefined,
  db: Queryable,
): Promise<string> {
  const token = randomToken();
  await db.query(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, now() + make_interval(days => $4), $5)`,
    [userId, familyId, sha256(token), env.REFRESH_TOKEN_TTL_DAYS, userAgent?.slice(0, 300) ?? null],
  );
  return token;
}

function sendAuth(req: Request, res: Response, user: UserRow, refreshToken: string, status = 200): void {
  const body: AuthResponse = {
    user: toMe(user),
    accessToken: signAccessToken(user.id),
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
  if (usesCookie(req)) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
    });
  } else {
    body.refreshToken = refreshToken;
  }
  res.status(status).json(body);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, httpOnly: true, sameSite: 'lax', secure: isProduction });
}

export const authRouter = Router();
authRouter.use(authLimiter);

authRouter.post('/register', async (req, res) => {
  const input = parse(registerSchema, req.body);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const { user, refreshToken } = await withTransaction(async (db) => {
      const user = (
        await db.query<UserRow>(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
          [input.email, input.name, passwordHash],
        )
      ).rows[0]!;
      const refreshToken = await issueRefreshToken(user.id, randomUUID(), req.get('user-agent'), db);
      return { user, refreshToken };
    });
    sendAuth(req, res, user, refreshToken, 201);
  } catch (err) {
    if (pgErrorCode(err) === '23505') throw conflict('An account with this email already exists');
    throw err;
  }
});

authRouter.post('/login', async (req, res) => {
  const input = parse(loginSchema, req.body);
  const user = await queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [input.email]);
  const valid = await bcrypt.compare(input.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) throw unauthorized('Incorrect email or password');
  const refreshToken = await issueRefreshToken(user.id, randomUUID(), req.get('user-agent'), pool);
  sendAuth(req, res, user, refreshToken);
});

authRouter.post('/refresh', async (req, res) => {
  const body = parse(refreshSchema, req.body);
  const presented: string | undefined = body.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
  if (!presented) throw unauthorized('No session');

  const result = await withTransaction(async (db) => {
    const token = (
      await db.query<{ id: string; user_id: string; family_id: string; expires_at: Date; revoked_at: Date | null }>(
        'SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE',
        [sha256(presented)],
      )
    ).rows[0];
    if (!token) return null;
    if (token.revoked_at) {
      // A rotated token was replayed: assume theft and revoke the whole session family.
      await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL', [
        token.family_id,
      ]);
      return null;
    }
    if (token.expires_at.getTime() <= Date.now()) return null;
    await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [token.id]);
    const user = (await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [token.user_id])).rows[0];
    if (!user) return null;
    const refreshToken = await issueRefreshToken(user.id, token.family_id, req.get('user-agent'), db);
    return { user, refreshToken };
  });

  if (!result) {
    clearRefreshCookie(res);
    throw unauthorized('Session expired, please sign in again');
  }
  sendAuth(req, res, result.user, result.refreshToken);
});

authRouter.post('/logout', async (req, res) => {
  const body = parse(refreshSchema, req.body);
  const presented: string | undefined = body.refreshToken ?? req.cookies?.[REFRESH_COOKIE];
  if (presented) {
    await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
      sha256(presented),
    ]);
  }
  clearRefreshCookie(res);
  res.status(204).end();
});
