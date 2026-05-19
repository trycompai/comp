-- CreateEnum
CREATE TYPE "FindingResolutionMethod" AS ENUM ('platform_fix', 'external_fix', 'resource_deleted', 'exception_marked');

-- AlterTable
ALTER TABLE "IntegrationCheckRun" ADD COLUMN     "failedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scannedServices" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "FindingException" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fex'::text),
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "markedById" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "FindingException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingResolution" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fres'::text),
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL,
    "resolutionMethod" "FindingResolutionMethod" NOT NULL,
    "resolvedById" TEXT,
    "remediationActionId" TEXT,
    "resolvedFromRunId" TEXT NOT NULL,
    "detectedInRunId" TEXT NOT NULL,
    "daysOpen" INTEGER,

    CONSTRAINT "FindingResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingRegression" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('freg'::text),
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "previouslyResolvedAt" TIMESTAMP(3) NOT NULL,
    "previousResolutionId" TEXT,
    "regressedAt" TIMESTAMP(3) NOT NULL,
    "detectedInRunId" TEXT NOT NULL,
    "daysClean" INTEGER,

    CONSTRAINT "FindingRegression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FindingException_organizationId_idx" ON "FindingException"("organizationId");

-- CreateIndex
CREATE INDEX "FindingException_connectionId_idx" ON "FindingException"("connectionId");

-- CreateIndex
CREATE INDEX "FindingException_checkId_resourceId_idx" ON "FindingException"("checkId", "resourceId");

-- CreateIndex
CREATE INDEX "FindingException_expiresAt_idx" ON "FindingException"("expiresAt");

-- CreateIndex
CREATE INDEX "FindingResolution_organizationId_idx" ON "FindingResolution"("organizationId");

-- CreateIndex
CREATE INDEX "FindingResolution_connectionId_idx" ON "FindingResolution"("connectionId");

-- CreateIndex
CREATE INDEX "FindingResolution_resolvedAt_idx" ON "FindingResolution"("resolvedAt");

-- CreateIndex
CREATE INDEX "FindingResolution_resolutionMethod_idx" ON "FindingResolution"("resolutionMethod");

-- CreateIndex
CREATE INDEX "FindingResolution_checkId_resourceId_idx" ON "FindingResolution"("checkId", "resourceId");

-- CreateIndex
CREATE INDEX "FindingRegression_organizationId_idx" ON "FindingRegression"("organizationId");

-- CreateIndex
CREATE INDEX "FindingRegression_connectionId_idx" ON "FindingRegression"("connectionId");

-- CreateIndex
CREATE INDEX "FindingRegression_regressedAt_idx" ON "FindingRegression"("regressedAt");

-- CreateIndex
CREATE INDEX "FindingRegression_checkId_resourceId_idx" ON "FindingRegression"("checkId", "resourceId");

-- AddForeignKey
ALTER TABLE "FindingException" ADD CONSTRAINT "FindingException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingException" ADD CONSTRAINT "FindingException_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingResolution" ADD CONSTRAINT "FindingResolution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingResolution" ADD CONSTRAINT "FindingResolution_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingRegression" ADD CONSTRAINT "FindingRegression_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingRegression" ADD CONSTRAINT "FindingRegression_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
