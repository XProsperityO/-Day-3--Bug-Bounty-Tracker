Integration test notes

To run integration tests locally you need a Postgres instance available.

Quick start (uses Docker Compose):

1. Start Postgres:

   docker compose up -d db

2. Set environment variable for tests (on Windows use set):

   export DATABASE_URL_TEST=postgres://test:test@localhost:5432/testdb

3. Deploy migrations:

   npx prisma migrate deploy

4. Run tests:

   NODE_ENV=test node -r ./scripts/use-test-db.cjs ./node_modules/vitest/vitest.mjs run --dir test/integration

If you don't want to use Docker, set `DATABASE_URL_TEST` to a reachable Postgres server; the integration tests assume a clean db schema.
