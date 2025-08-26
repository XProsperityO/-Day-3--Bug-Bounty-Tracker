/* eslint-env node */
// Load local .env for convenience in development and test runs (no-op if dotenv not installed)
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  require('dotenv').config();
} catch (e) {
  // dotenv is optional; ignore if not installed
}

// Ensure NODE_ENV=test is set for test runs
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test';

// If a dedicated test database URL is provided, prefer it before Prisma loads.
if (process.env.DATABASE_URL_TEST && process.env.DATABASE_URL_TEST.trim() !== '') {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  // eslint-disable-next-line no-console
  console.log('[test-db] Using DATABASE_URL_TEST for tests');
}

// Fail fast with a helpful message if running tests without a DATABASE_URL configured.
if (process.env.NODE_ENV === 'test' && (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '')) {
  // eslint-disable-next-line no-console
  console.error('\n[test-db] ERROR: No test database configured.');
  // eslint-disable-next-line no-console
  console.error('[test-db] Set DATABASE_URL_TEST or DATABASE_URL in your environment or create a .env file with DATABASE_URL_TEST.');
  // Provide a suggested Docker Compose snippet for convenience
  // eslint-disable-next-line no-console
  console.error('[test-db] Example (docker-compose): \nversion: \"3.8\"\nservices:\n  db:\n    image: postgres:15\n    environment:\n      POSTGRES_USER: test\n      POSTGRES_PASSWORD: test\n      POSTGRES_DB: testdb\n    ports:\n      - \"5432:5432\"\nThen set DATABASE_URL_TEST=postgres://test:test@localhost:5432/testdb');
  // Exit so tests fail fast and you get a clear actionable message
  process.exit(1);
}
