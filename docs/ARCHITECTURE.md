# Architecture Overview

## Domain Model (MVP)
User
- id (uuid) | email (unique) | passwordHash | displayName | createdAt | updatedAt | totpEnabled | totpSecret (encrypted) | role (USER|ADMIN)

Vulnerability
- id | userId | title | description (markdown) | severity (enum: INFO,LOW,MEDIUM,HIGH,CRITICAL) | cvssVector | cvssScore | status (OPEN, REPORTED, TRIAGED, RESOLVED, REJECTED, DUPLICATE, PAID) | payoutAmount (decimal) | target | tags (string[]) | discoveredAt | reportedAt | resolvedAt | paidAt | createdAt | updatedAt

Submission
- id | vulnerabilityId | platform (HACKERONE|BUGCROWD|INTIGRITI|YESWEHACK|PRIVATE) | externalId | url | state | createdAt | updatedAt

TimelineEvent
- id | vulnerabilityId | type (DISCOVERED|REPORTED|COMMENT|STATUS_CHANGE|PAID) | message | happenedAt | meta (jsonb)

Note
- id | userId | vulnerabilityId? | title | content (markdown) | createdAt | updatedAt | tags (string[])

Evidence (future phase 2)
- id | vulnerabilityId | fileKey | originalName | size | mime | sha256 | createdAt | uploadedBy

Metric Snapshot (materialized view later)

## Service Boundaries
Auth Service – registration, login, token rotation, TOTP, password changes.
Vulnerability Service – CRUD, lifecycle transitions, CVSS calculation helper.
Submission Service – link to platforms & timeline consolidation.
Notes Service – personal knowledge base & cross-linking.
Billing Service (stub) – plan management, Stripe webhooks, entitlement resolution.
Metrics Service – aggregate queries (PostgreSQL + caching layer).

## Persistence
PostgreSQL (Prisma). Use native enums. jsonb for flexible metadata.
Redis (planned) for: rate limit counters, session revocations, short-lived caches.
S3-compatible storage (phase 2) for evidence (signed URLs, antivirus pipeline).

## Security Controls (MVP Implemented)
- Password hashing: bcrypt (cost 12) (swap to argon2id when infra ready)
- JWT: access 10m, refresh 7d, rotation on every refresh, jti uniqueness stored in Redis (future) fallback in DB table RefreshToken.
- Input validation all routes via Zod schema wrappers.
- Rate limiting: IP + per-user (low thresholds for auth endpoints).
- Logging: pino -> console (JSON). Include correlationId middleware (request-id header).
- Error handling: sanitized messages, internal codes.
- CSP: script-src 'self' 'nonce-<dynamic>' *.trusted(later). no inline except nonce.

## Duplicate Detection (Future)
Phase 3: Embedding vector store (pgvector) keyed on vulnerability normalized text; similarity threshold scanning on create/update.

## Analytics
Simple aggregated SQL queries (counts, sums) with caching; expand to materialized views or Elasticsearch for advanced filters later.

## Deployment (Future)
Container images (multi-stage). Migrations on startup job. GitHub Actions: lint -> test -> build -> security scan (npm audit + Trivy) -> deploy (render/fly.io/ECS/K8s).
