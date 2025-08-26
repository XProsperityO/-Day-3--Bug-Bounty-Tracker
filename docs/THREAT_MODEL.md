# Bug Bounty Tracker Threat Model (MVP)

## Assets
- User credentials (email, password, TOTP secret)
- Vulnerability data (title, description, severity, CVSS, evidence)
- Notes, submissions, timeline events
- Billing/subscription data (Stripe IDs)
- Audit logs

## Trust Boundaries
- API server (Fastify/Node)
- Database (PostgreSQL)
- File storage (future: S3/local)
- Stripe API
- Frontend (React)
- CI/CD pipeline

## Key Threats
- Credential theft (phishing, brute force, token leakage)
- Privilege escalation (RBAC bypass, plan enforcement gaps)
- Data exfiltration (DB dump, file download, API abuse)
- Injection (SQL, command, file upload)
- SSRF, XSS, CSRF
- Billing fraud (plan downgrade, Stripe webhook tampering)
- Supply chain compromise (npm, Docker, CI)
- Denial of service (rate limit bypass, resource exhaustion)

## Controls
- Argon2 password hashing, TOTP MFA
- JWT rotation, short TTL, refresh token revocation
- Strict CORS, CSP, input validation (Zod)
- Per-plan rate limits, RBAC middleware
- Audit logging for sensitive actions
- Stripe webhook signature verification
- Prometheus metrics, health/readiness endpoints
- CI pipeline with SBOM, Trivy scan
- Infra as code, secrets via K8s

## Gaps / TODO
- File evidence malware scan
- TOTP secret encryption/KMS
- Redis session revocation
- SSO/SAML integration
- Automated backup/restore
- Data retention & GDPR workflows
- Security incident runbooks
- Regular threat model review

---
# Compliance Logging Hooks (MVP)

- All audit events (auth, billing, plan change) are logged via `registerAudit` middleware.
- Timeline events for plan changes and subscription lifecycle.
- Health/readiness checks log failures.
- All errors are logged with requestId and userId (if available).
- Next: Add log shipping to SIEM, structured compliance event types, and retention policy.
