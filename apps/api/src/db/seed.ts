import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { pool } from './pool';

/**
 * Creates (or resets the password of) a demo account for local development.
 * Credentials come from DEMO_USER_EMAIL / DEMO_USER_PASSWORD (see .env.example).
 * Refuses to run in production.
 */
const seedEnv = z.object({
  NODE_ENV: z.string().optional(),
  DEMO_USER_EMAIL: z.string().email('DEMO_USER_EMAIL must be set to an email address'),
  DEMO_USER_PASSWORD: z.string().min(8, 'DEMO_USER_PASSWORD must be at least 8 characters'),
  DEMO_USER_NAME: z.string().default('Demo Candidate'),
});

async function main(): Promise<void> {
  const env = seedEnv.parse(process.env);
  if (env.NODE_ENV === 'production') throw new Error('Refusing to seed a demo user in production');

  const hash = await bcrypt.hash(env.DEMO_USER_PASSWORD, 12);
  const { rows } = await pool.query<{ id: string; inserted: boolean }>(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, (xmax = 0) AS inserted`,
    [env.DEMO_USER_EMAIL.toLowerCase(), env.DEMO_USER_NAME, hash],
  );
  logger.info({ email: env.DEMO_USER_EMAIL, created: rows[0]?.inserted }, 'Demo user ready');
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    logger.fatal({ err }, 'Seeding failed');
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
