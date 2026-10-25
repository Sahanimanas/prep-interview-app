/**
 * Runs once before the test run: makes sure the dedicated test database exists and is migrated.
 * Tests never share the development database — a running dev worker would otherwise claim
 * the tests' jobs (and process them with the real AI).
 */
import pg from 'pg';
import { TEST_ENV } from './test-env';

export default async function globalSetup(): Promise<void> {
  Object.assign(process.env, { ...TEST_ENV, ...process.env, NODE_ENV: 'test', AI_MOCK: 'true' });

  const url = new URL(process.env.DATABASE_URL!);
  const dbName = url.pathname.slice(1);
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';

  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!rowCount) await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }

  const { runMigrations } = await import('../src/db/migrate');
  const { pool } = await import('../src/db/pool');
  await runMigrations();
  await pool.end();
}
