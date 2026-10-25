import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../lib/logger';
import { pool } from './pool';

// Arbitrary constant: serialises concurrent migration runs (several replicas booting at once).
const MIGRATION_LOCK_ID = 727_001;

function migrationsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/db -> ../../migrations (tsx) ; dist -> ../migrations (bundled)
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.resolve(here, '../../migrations'),
    path.resolve(here, '../migrations'),
  ].filter((p): p is string => !!p);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`Migrations directory not found (looked in ${candidates.join(', ')})`);
  return found;
}

export async function runMigrations(): Promise<string[]> {
  const dir = migrationsDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    const { rows } = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
    const done = new Set(rows.map((r) => r.version));

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), 'utf8');
      logger.info({ migration: file }, 'Applying migration');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }
  logger.info({ applied: applied.length }, applied.length ? 'Migrations applied' : 'Database schema up to date');
  return applied;
}
