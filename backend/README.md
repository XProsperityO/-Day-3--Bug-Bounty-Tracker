Bug Bounty Tracker — Backend

Quick start

- Install dependencies:

```bash
npm install
```

Run tests (fast, mocked DB)

- Recommended for local dev (fast):

```bash
# Windows cmd.exe
set PRISMA_MOCK=1 && set NODE_ENV=test && npm run test:fast
```

This uses an in-memory Prisma mock (PRISMA_MOCK=1) so tests run quickly without requiring a Postgres instance.

Run the full test suite with a real test database

- Apply migrations and run tests against a test Postgres database (ensure DATABASE_URL_TEST is set):

```bash
# Windows cmd.exe: deploy migrations then run CI test command
npm run prisma migrate deploy
set NODE_ENV=test && node -r ./scripts/use-test-db.cjs ./node_modules/vitest/vitest.mjs run
```

Notes

- The project enables Vitest globals in `vitest.config.ts`; tests should not `import { describe } from 'vitest'` — use the globals instead.
- For quick local iteration use `npm run test:fast`.
- CI should run `npm run test:ci` (this deploys migrations then runs tests with coverage).

Helpful scripts

- `scripts/use-test-db.cjs` — small preload that maps `DATABASE_URL_TEST` to `DATABASE_URL` and sets `NODE_ENV=test` for test runs.
- `scripts/run-integration.cjs` — helper to run integration tests that may require the real DB.

Cleanup

- Temporary diagnostic scripts used during debugging have been removed from `scripts/`.

If you'd like, I can add editor TypeScript support for Vitest globals (devDependency + tsconfig) or tidy more scripts.
