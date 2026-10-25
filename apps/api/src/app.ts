import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { pool } from './db/pool';
import { logger } from './lib/logger';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { globalLimiter } from './middleware/rate-limit';
import { authRouter } from './modules/auth.routes';
import { intakeRouter } from './modules/intake.routes';
import { jobsRouter } from './modules/jobs.routes';
import { meRouter } from './modules/me.routes';
import { mocksRouter } from './modules/mocks.routes';
import { plansRouter } from './modules/plans.routes';
import { questionsRouter } from './modules/questions.routes';
import { quizzesRouter } from './modules/quizzes.routes';
import { topicsRouter } from './modules/topics.routes';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/healthz' || req.url === '/readyz' },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      // Web uses a same-origin proxy; this allows other configured origins (e.g. Expo web in dev).
      origin: (origin, cb) => cb(null, !origin || env.CORS_ORIGINS.includes(origin)),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/readyz', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  const api = Router();
  api.use(globalLimiter);
  api.use('/auth', authRouter);

  // Everything below requires a valid access token.
  api.use(requireAuth);
  api.use('/me', meRouter);
  api.use('/intake', intakeRouter);
  api.use('/plans', plansRouter);
  api.use('/topics', topicsRouter);
  api.use('/jobs', jobsRouter);
  api.use(questionsRouter);
  api.use(quizzesRouter);
  api.use(mocksRouter);

  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
