import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { env, isTest } from '../config/env';

// In-memory stores are per-process. When running several API replicas, plug a shared store
// (e.g. a Postgres- or Redis-backed store) into these limiters.

const rateLimitedResponse = (message: string): Partial<Options> => ({
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'RATE_LIMITED', message } });
  },
});

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  ...rateLimitedResponse('Too many requests. Please slow down.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  ...rateLimitedResponse('Too many sign-in attempts. Please try again in a few minutes.'),
});

/** Per-user budget for expensive AI calls. Mount after requireAuth. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: env.AI_RATE_LIMIT_PER_HOUR,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
  ...rateLimitedResponse('You have reached the hourly AI generation limit. Please try again later.'),
});
