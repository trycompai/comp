-- CreateTable
CREATE TABLE "RemediationBatch" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('rmb'::text),
    "connectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "triggerRunId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "findings" JSONB NOT NULL DEFAULT '[]',
    "fixed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemediationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemediationBatch_connectionId_idx" ON "RemediationBatch"("connectionId");

-- CreateIndex
CREATE INDEX "RemediationBatch_organizationId_idx" ON "RemediationBatch"("organizationId");

-- CreateIndex
CREATE INDEX "RemediationBatch_status_idx" ON "RemediationBatch"("status");

-- AddForeignKey
ALTER TABLE "RemediationBatch" ADD CONSTRAINT "RemediationBatch_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
