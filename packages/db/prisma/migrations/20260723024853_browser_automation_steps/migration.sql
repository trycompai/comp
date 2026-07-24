-- CreateTable
CREATE TABLE "BrowserAutomationStep" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bas'::text),
    "automationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "profileId" TEXT,
    "targetUrl" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "evaluationCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserAutomationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrowserAutomationStepRun" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('basr'::text),
    "runId" TEXT NOT NULL,
    "stepId" TEXT,
    "order" INTEGER NOT NULL,
    "status" "BrowserAutomationRunStatus" NOT NULL DEFAULT 'pending',
    "screenshotUrl" TEXT,
    "evaluationStatus" "BrowserAutomationEvaluationStatus",
    "evaluationReason" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrowserAutomationStepRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrowserAutomationStep_automationId_idx" ON "BrowserAutomationStep"("automationId");

-- CreateIndex
CREATE INDEX "BrowserAutomationStep_profileId_idx" ON "BrowserAutomationStep"("profileId");

-- CreateIndex
CREATE INDEX "BrowserAutomationStepRun_runId_idx" ON "BrowserAutomationStepRun"("runId");

-- CreateIndex
CREATE INDEX "BrowserAutomationStepRun_stepId_idx" ON "BrowserAutomationStepRun"("stepId");

-- AddForeignKey
ALTER TABLE "BrowserAutomationStep" ADD CONSTRAINT "BrowserAutomationStep_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "BrowserAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserAutomationStep" ADD CONSTRAINT "BrowserAutomationStep_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BrowserAuthProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserAutomationStepRun" ADD CONSTRAINT "BrowserAutomationStepRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BrowserAutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserAutomationStepRun" ADD CONSTRAINT "BrowserAutomationStepRun_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "BrowserAutomationStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: give every existing automation a first step (order 0) from its
-- inline fields, binding to a connection matched by hostname when one exists.
-- Insurance only — the feature is unused, so this is expected to be a no-op.
INSERT INTO "BrowserAutomationStep" ("automationId", "order", "profileId", "targetUrl", "instruction", "evaluationCriteria", "updatedAt")
SELECT
  ba."id",
  0,
  (SELECT p."id"
     FROM "BrowserAuthProfile" p
     WHERE p."organizationId" = (SELECT t."organizationId" FROM "Task" t WHERE t."id" = ba."taskId")
       AND p."hostname" = lower(regexp_replace(ba."targetUrl", '^https?://([^/]+).*$', '\1'))
     ORDER BY (p."status" = 'verified') DESC, p."updatedAt" DESC
     LIMIT 1),
  ba."targetUrl",
  ba."instruction",
  ba."evaluationCriteria",
  CURRENT_TIMESTAMP
FROM "BrowserAutomation" ba;
