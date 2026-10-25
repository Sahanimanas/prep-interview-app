/** Defaults for the test environment; values already present in process.env win. */
export const TEST_ENV: Record<string, string> = {
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgres://preppilot:preppilot@localhost:5434/preppilot_test',
  JWT_ACCESS_SECRET: 'test-access-secret-that-is-at-least-32-characters-long',
  ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
};
