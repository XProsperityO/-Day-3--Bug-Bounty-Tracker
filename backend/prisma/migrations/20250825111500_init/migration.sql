-- Initial schema migration generated manually to match prisma schema.prisma
-- NOTE: If you later run `prisma migrate dev` it will create subsequent migrations.

-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE "Severity" AS ENUM ('INFO','LOW','MEDIUM','HIGH','CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "VulnStatus" AS ENUM ('OPEN','REPORTED','TRIAGED','RESOLVED','REJECTED','DUPLICATE','PAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "Platform" AS ENUM ('HACKERONE','BUGCROWD','INTIGRITI','YESWEHACK','PRIVATE');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "Plan" AS ENUM ('STARTER','PROFESSIONAL','ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
  "totpSecret" TEXT,
  "plan" "Plan" DEFAULT 'STARTER',
  "subscriptionId" TEXT,
  "customerId" TEXT,
  "planUpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "User_email_key" UNIQUE ("email")
);

CREATE TABLE IF NOT EXISTS "Vulnerability" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
  "cvssVector" TEXT,
  "cvssScore" DOUBLE PRECISION,
  "status" "VulnStatus" NOT NULL DEFAULT 'OPEN',
  "payoutAmount" DECIMAL(10,2),
  "target" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "discoveredAt" TIMESTAMPTZ,
  "reportedAt" TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  "paidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Vulnerability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Submission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "vulnerabilityId" UUID NOT NULL,
  "platform" "Platform" NOT NULL,
  "externalId" TEXT,
  "url" TEXT,
  "state" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TimelineEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "vulnerabilityId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT,
  "happenedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "meta" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Note" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "vulnerabilityId" UUID,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefreshToken_tokenHash_key" UNIQUE ("tokenHash")
);

-- FKs
ALTER TABLE "Vulnerability" ADD CONSTRAINT "Vulnerability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "User_plan_idx" ON "User"("plan");
CREATE INDEX IF NOT EXISTS "Vulnerability_userId_status_idx" ON "Vulnerability"("userId", "status");
CREATE INDEX IF NOT EXISTS "Vulnerability_userId_severity_idx" ON "Vulnerability"("userId", "severity");
CREATE INDEX IF NOT EXISTS "Vulnerability_userId_createdAt_idx" ON "Vulnerability"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Note_userId_createdAt_idx" ON "Note"("userId", "createdAt");

-- Update triggers for updatedAt (simple approach using triggers or rely on app logic)
-- (Omitted for brevity; application layer updates updatedAt via Prisma)
