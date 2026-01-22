-- CreateTable
CREATE TABLE "public"."IntegrationCheckRun" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('icr'::text),
    "connectionId" TEXT NOT NULL,
    "taskId" TEXT,
    "checkId" TEXT NOT NULL,
    "checkName" TEXT NOT NULL,
    "status" "public"."IntegrationRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "totalChecked" INTEGER NOT NULL DEFAULT 0,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "logs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationCheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IntegrationCheckResult" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('icx'::text),
    "checkRunId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "public"."IntegrationFindingSeverity",
    "remediation" TEXT,
    "evidence" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationCheckRun_connectionId_idx" ON "public"."IntegrationCheckRun"("connectionId");

-- CreateIndex
CREATE INDEX "IntegrationCheckRun_taskId_idx" ON "public"."IntegrationCheckRun"("taskId");

-- CreateIndex
CREATE INDEX "IntegrationCheckRun_checkId_idx" ON "public"."IntegrationCheckRun"("checkId");

-- CreateIndex
CREATE INDEX "IntegrationCheckRun_status_idx" ON "public"."IntegrationCheckRun"("status");

-- CreateIndex
CREATE INDEX "IntegrationCheckRun_createdAt_idx" ON "public"."IntegrationCheckRun"("createdAt");

-- CreateIndex
CREATE INDEX "IntegrationCheckResult_checkRunId_idx" ON "public"."IntegrationCheckResult"("checkRunId");

-- CreateIndex
CREATE INDEX "IntegrationCheckResult_passed_idx" ON "public"."IntegrationCheckResult"("passed");

-- CreateIndex
CREATE INDEX "IntegrationCheckResult_resourceType_resourceId_idx" ON "public"."IntegrationCheckResult"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "public"."IntegrationCheckRun" ADD CONSTRAINT "IntegrationCheckRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationCheckRun" ADD CONSTRAINT "IntegrationCheckRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IntegrationCheckResult" ADD CONSTRAINT "IntegrationCheckResult_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES "public"."IntegrationCheckRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
