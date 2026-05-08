-- CreateTable
CREATE TABLE "RemediationAction" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('rma'::text),
    "checkResultId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "remediationKey" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "previousState" JSONB NOT NULL,
    "appliedState" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemediationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemediationAction_connectionId_idx" ON "RemediationAction"("connectionId");

-- CreateIndex
CREATE INDEX "RemediationAction_organizationId_idx" ON "RemediationAction"("organizationId");

-- CreateIndex
CREATE INDEX "RemediationAction_checkResultId_idx" ON "RemediationAction"("checkResultId");

-- AddForeignKey
ALTER TABLE "RemediationAction" ADD CONSTRAINT "RemediationAction_checkResultId_fkey" FOREIGN KEY ("checkResultId") REFERENCES "IntegrationCheckResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemediationAction" ADD CONSTRAINT "RemediationAction_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
