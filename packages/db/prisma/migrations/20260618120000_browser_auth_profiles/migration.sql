CREATE TYPE "BrowserAuthProfileStatus" AS ENUM (
    'unverified',
    'verified',
    'needs_reauth',
    'blocked'
);

CREATE TYPE "BrowserAutomationFailureCode" AS ENUM (
    'needs_reauth',
    'needs_user_action',
    'rate_limited',
    'captcha_blocked',
    'timeout',
    'browser_session_lost',
    'evaluation_failed',
    'unknown'
);

CREATE TYPE "BrowserAutomationFailureStage" AS ENUM (
    'auth',
    'navigation',
    'action',
    'screenshot',
    'evaluation',
    'upload',
    'session',
    'unknown'
);

ALTER TYPE "BrowserAutomationRunStatus" ADD VALUE IF NOT EXISTS 'blocked';

CREATE TABLE "BrowserAuthProfile" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bap'::text),
    "organizationId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "loginIdentity" TEXT NOT NULL DEFAULT '',
    "displayName" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "status" "BrowserAuthProfileStatus" NOT NULL DEFAULT 'unverified',
    "lastVerifiedAt" TIMESTAMP(3),
    "lastAuthCheckUrl" TEXT,
    "blockedReason" TEXT,
    "vaultProvider" TEXT,
    "vaultExternalItemRef" TEXT,
    "vaultConnectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BrowserAuthProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BrowserAutomationRun"
ADD COLUMN "profileId" TEXT,
ADD COLUMN "failureCode" "BrowserAutomationFailureCode",
ADD COLUMN "failureStage" "BrowserAutomationFailureStage",
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "blockedReason" TEXT,
ADD COLUMN "finalUrl" TEXT,
ADD COLUMN "logs" JSONB;

CREATE UNIQUE INDEX "BrowserAuthProfile_organizationId_hostname_loginIdentity_key"
ON "BrowserAuthProfile"("organizationId", "hostname", "loginIdentity");

CREATE INDEX "BrowserAuthProfile_organizationId_idx"
ON "BrowserAuthProfile"("organizationId");

CREATE INDEX "BrowserAuthProfile_organizationId_hostname_idx"
ON "BrowserAuthProfile"("organizationId", "hostname");

CREATE INDEX "BrowserAuthProfile_status_idx"
ON "BrowserAuthProfile"("status");

CREATE INDEX "BrowserAutomationRun_profileId_idx"
ON "BrowserAutomationRun"("profileId");

CREATE INDEX "BrowserAutomationRun_failureCode_idx"
ON "BrowserAutomationRun"("failureCode");

ALTER TABLE "BrowserAuthProfile"
ADD CONSTRAINT "BrowserAuthProfile_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BrowserAutomationRun"
ADD CONSTRAINT "BrowserAutomationRun_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "BrowserAuthProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
