import { env } from './config/env';
import { runMigrations } from './db/migrate';
import { pool } from './db/pool';
import { JobWorker } from './jobs/worker';
import { logger } from './lib/logger';

/** Standalone worker process: scale it independently of the API. */
async function main(): Promise<void> {
  if (env.MIGRATE_ON_START) await runMigrations();
  const worker = new JobWorker(env.WORKER_CONCURRENCY);
  await worker.start();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Worker shutting down');
    await worker.stop();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => logger.error({ err }, 'Unhandled promise rejection'));

main().catch((err) => {
  logger.fatal({ err }, 'Worker failed to start');
  process.exit(1);
});
