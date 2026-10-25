import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import { pool } from './db/pool';
import { JobWorker } from './jobs/worker';
import { logger } from './lib/logger';

async function main(): Promise<void> {
  if (env.MIGRATE_ON_START) await runMigrations();

  const server = createServer(createApp());
  // Mock interview turns and intake questions call the model synchronously; allow for slow responses.
  server.requestTimeout = 5 * 60_000;
  server.headersTimeout = 65_000;
  server.keepAliveTimeout = 61_000;

  const worker = env.RUN_WORKER ? new JobWorker(env.WORKER_CONCURRENCY) : null;

  await new Promise<void>((resolve) => server.listen(env.PORT, '0.0.0.0', resolve));
  logger.info({ port: env.PORT, model: env.AI_MODEL, aiMock: env.AI_MOCK }, 'API listening');
  await worker?.start();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    const force = setTimeout(() => process.exit(1), 30_000);
    force.unref();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await worker?.stop();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled promise rejection'));

main().catch((err) => {
  logger.fatal({ err }, 'API failed to start');
  process.exit(1);
});
