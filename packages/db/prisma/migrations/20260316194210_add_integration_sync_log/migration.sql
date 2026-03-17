-- CreateEnum
CREATE TYPE "IntegrationSyncLogStatus" AS ENUM ('pending', 'running', 'success', 'failed');

-- CreateTable
CREATE TABLE "IntegrationSyncLog" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isl'::text),
    "connectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" "IntegrationSyncLogStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "result" JSONB,
    "error" TEXT,
    "triggeredBy" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_connectionId_idx" ON "IntegrationSyncLog"("connectionId");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_organizationId_idx" ON "IntegrationSyncLog"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_provider_idx" ON "IntegrationSyncLog"("provider");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_createdAt_idx" ON "IntegrationSyncLog"("createdAt");

-- AddForeignKey
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
