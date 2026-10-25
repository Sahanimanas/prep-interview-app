/**
 * Runs before every test file (see vitest.config.ts). `src/config/env.ts` validates the environment
 * at import time, so required variables must exist before any app module is imported.
 * Existing values win (CI points DATABASE_URL at its own test database), except NODE_ENV and
 * AI_MOCK, which are forced so tests never call the real AI API.
 */
import { TEST_ENV } from './test-env';

for (const [key, value] of Object.entries(TEST_ENV)) process.env[key] ??= value;
process.env.NODE_ENV = 'test';
process.env.AI_MOCK = 'true';
