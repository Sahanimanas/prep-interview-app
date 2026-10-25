import { logger } from '../lib/logger';
import { runMigrations } from './migrate';
import { pool } from './pool';

runMigrations()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.fatal({ err }, 'Migration failed');
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
