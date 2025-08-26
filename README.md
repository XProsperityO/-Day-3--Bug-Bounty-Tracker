Bug Bounty Tracker – MVP
=================================

Secure micro-SaaS platform for security researchers to track vulnerabilities, research workflow, and bounty performance.

Status: MVP Scaffolding (Backend + Frontend skeleton)

## Core MVP Scope (10-hour target)
1. Auth (email/password + TOTP placeholder) with JWT access/refresh & secure session revocation list (Redis ready)
2. Users & Profiles (basic researcher metadata)
3. Vulnerabilities (core entity) – status lifecycle, severity (CVSS base), affected target, payout info
4. Submissions (per platform) – link to external platform, timeline events
5. Notes (markdown) + evidence file metadata (storage adapter abstraction)
6. Basic metrics endpoint (counts, accepted vs rejected, total bounty amount)
7. Billing placeholder (Stripe webhook endpoint + plan enum; actual keys to be added later)
8. Security middleware: rate limit, helmet/CSP, input validation (Zod), logging, error normalization

## Stack
Backend: Node.js 18+, TypeScript, Fastify, Prisma (PostgreSQL), Zod, jsonwebtoken, bcrypt, pino, rate-limiter-flexible, helmet, uuid.
Frontend: React 18 + TypeScript, Vite, Tailwind CSS, Zustand for state, react-query for data fetching, react-hook-form + zod.
Infra (future): Docker, PostgreSQL, Redis, S3-compatible storage, Stripe Billing, Elasticsearch (phase 2), OpenAI/Local embedding service (dup detection – phase 3).

## Running (development)
1. Copy `.env.example` to `.env` in backend & fill values.
2. Install deps (backend & frontend).
3. Run Prisma migrate & dev servers.

See `docs/GETTING_STARTED.md` for commands.

## Production (Containerized)
1. Build images & start stack:
```
docker compose up --build -d
```
2. Apply migrations (compose command already uses migrate deploy). For first run ensure DB is reachable.
3. Set strong secrets in environment (override compose or use secrets manager):
	- JWT_ACCESS_SECRET (>=32 random chars)
	- JWT_REFRESH_SECRET (>=48 random chars)
4. Add reverse proxy (e.g., nginx / Traefik) enforcing HTTPS + HSTS.
5. Configure monitoring: scrape /health endpoints (live, ready).
6. Set proper CSP & origin allowlist via env CORS_ORIGIN.

## Security Hardening Added
- Integration & unit tests added (auth, vuln lifecycle, billing fallback, JWT, CVSS). Run:
```
cd backend
npx prisma migrate deploy
npm run test:integration
```

## Database Migrations
During development (auto creating new migrations):
```
cd backend
npx prisma migrate dev --name <change>
```
For production / CI deploy:
```
npx prisma migrate deploy
```
After modifying schema:
1. Create migration in dev.
2. Commit migration files under prisma/migrations.
3. CI runs migrate deploy before starting app.

### Postgres Credential Handling
You can either supply a full `DATABASE_URL` or set PG_* component variables and generate it:
```
cd backend
copy .env.example .env
# (Optionally edit PG_USER / PG_PASSWORD / PG_DB in .env or set them inline)
npm run gen-env
npx prisma migrate dev --name init
```
The script will compose: `postgresql://PG_USER:PG_PASSWORD@PG_HOST:PG_PORT/PG_DB?schema=public` and place it into `.env`.


Test database recommendation:
- Use a separate DATABASE_URL pointing to a disposable schema or database.
- Run `npx prisma migrate deploy` before `npm run test:integration`.

- CVSS vector validation & scoring
- Vulnerability lifecycle transition endpoint with automatic timestamps
- TOTP enrollment & verification endpoints
- Health endpoints (/health/live, /health/ready)
- Prisma indexes for common query patterns
- Config schema validation (fail-fast on boot)
- Dockerfile (multi-stage) & compose for local infra


## Security Baseline Implemented
- Strict CORS allowlist (env)
- HTTP security headers (helmet + custom CSP)
- Central validation layer (Zod schemas)
- Structured audit logging (pino)
- Rate limiting (IP + user tier bucket)
- JWT rotation & short access token TTL
- Argon2 (future) currently bcrypt (swap easy)
- Placeholder TOTP secret storage (encrypted at rest – add KMS later)

## Next Phases
Phase 2: File uploads (malware scan hook), advanced analytics, program API sync jobs.
Phase 3: AI duplicate detection (vector embeddings), recon automation integration, SSO (SAML/OIDC), RBAC teams.

## License
To be determined (proprietary SaaS). Add appropriate Terms & Privacy before production.
