-- CreateEnum
CREATE TYPE "public"."IntegrationConnectionStatus" AS ENUM ('pending', 'active', 'error', 'paused', 'disconnected');

-- CreateEnum
CREATE TYPE "public"."IntegrationRunJobType" AS ENUM ('full_sync', 'delta_sync', 'webhook', 'manual', 'test_connection');

-- CreateEnum
CREATE TYPE "public"."IntegrationRunStatus" AS ENUM ('pending', 'running', 'success', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."IntegrationFindingSeverity" AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "public"."IntegrationFindingStatus" AS ENUM ('open', 'resolved', 'ignored');

-- CreateTable
CREATE TABLE "public"."IntegrationProvider" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('prv'::text),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "manifestHash" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationConnection" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('icn'::text),
    "providerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "public"."IntegrationConnectionStatus" NOT NULL DEFAULT 'pending',
    "authStrategy" TEXT NOT NULL,
    "activeCredentialVersionId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "syncCadence" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationCredentialVersion" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('icv'::text),
    "connectionId" TEXT NOT NULL,
    "encryptedPayload" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationCredentialVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationRun" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('irn'::text),
    "connectionId" TEXT NOT NULL,
    "jobType" "public"."IntegrationRunJobType" NOT NULL,
    "status" "public"."IntegrationRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "findingsCount" INTEGER NOT NULL DEFAULT 0,
    "error" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationPlatformFinding" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ipf'::text),
    "runId" TEXT,
    "connectionId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "public"."IntegrationFindingSeverity" NOT NULL DEFAULT 'info',
    "status" "public"."IntegrationFindingStatus" NOT NULL DEFAULT 'open',
    "remediation" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationPlatformFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationOAuthState" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ios'::text),
    "state" TEXT NOT NULL,
    "providerSlug" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "redirectUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationProvider_slug_key" ON "public"."IntegrationProvider"("slug");

-- CreateIndex
CREATE INDEX "IntegrationProvider_slug_idx" ON "public"."IntegrationProvider"("slug");

-- CreateIndex
CREATE INDEX "IntegrationProvider_category_idx" ON "public"."IntegrationProvider"("category");

-- CreateIndex
CREATE INDEX "IntegrationConnection_organizationId_idx" ON "public"."IntegrationConnection"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_providerId_idx" ON "public"."IntegrationConnection"("providerId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_status_idx" ON "public"."IntegrationConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_providerId_organizationId_key" ON "public"."IntegrationConnection"("providerId", "organizationId");

-- CreateIndex
CREATE INDEX "IntegrationCredentialVersion_connectionId_idx" ON "public"."IntegrationCredentialVersion"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredentialVersion_connectionId_version_key" ON "public"."IntegrationCredentialVersion"("connectionId", "version");

-- CreateIndex
CREATE INDEX "IntegrationRun_connectionId_idx" ON "public"."IntegrationRun"("connectionId");

-- CreateIndex
CREATE INDEX "IntegrationRun_status_idx" ON "public"."IntegrationRun"("status");

-- CreateIndex
CREATE INDEX "IntegrationRun_createdAt_idx" ON "public"."IntegrationRun"("createdAt");

-- CreateIndex
CREATE INDEX "IntegrationPlatformFinding_connectionId_idx" ON "public"."IntegrationPlatformFinding"("connectionId");

-- CreateIndex
CREATE INDEX "IntegrationPlatformFinding_runId_idx" ON "public"."IntegrationPlatformFinding"("runId");

-- CreateIndex
CREATE INDEX "IntegrationPlatformFinding_resourceType_resourceId_idx" ON "public"."IntegrationPlatformFinding"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "IntegrationPlatformFinding_severity_idx" ON "public"."IntegrationPlatformFinding"("severity");

-- CreateIndex
CREATE INDEX "IntegrationPlatformFinding_status_idx" ON "public"."IntegrationPlatformFinding"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationOAuthState_state_key" ON "public"."IntegrationOAuthState"("state");

-- CreateIndex
CREATE INDEX "IntegrationOAuthState_state_idx" ON "public"."IntegrationOAuthState"("state");

-- CreateIndex
CREATE INDEX "IntegrationOAuthState_expiresAt_idx" ON "public"."IntegrationOAuthState"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."IntegrationProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationCredentialVersion" ADD CONSTRAINT "IntegrationCredentialVersion_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationRun" ADD CONSTRAINT "IntegrationRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationPlatformFinding" ADD CONSTRAINT "IntegrationPlatformFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "public"."IntegrationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationPlatformFinding" ADD CONSTRAINT "IntegrationPlatformFinding_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
