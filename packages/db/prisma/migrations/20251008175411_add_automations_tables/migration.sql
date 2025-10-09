-- CreateEnum
CREATE TYPE "public"."EvidenceAutomationRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."EvidenceAutomationTrigger" AS ENUM ('manual', 'scheduled', 'api');

-- CreateTable
CREATE TABLE "public"."EvidenceAutomationRun" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ear'::text),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "evidenceAutomationId" TEXT NOT NULL,
    "status" "public"."EvidenceAutomationRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "success" BOOLEAN,
    "error" TEXT,
    "logs" JSONB,
    "output" JSONB,
    "triggeredBy" "public"."EvidenceAutomationTrigger" NOT NULL DEFAULT 'scheduled',
    "runDuration" INTEGER,
    "taskId" TEXT,

    CONSTRAINT "EvidenceAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EvidenceAutomation" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('aut'::text),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "EvidenceAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceAutomationRun_evidenceAutomationId_idx" ON "public"."EvidenceAutomationRun"("evidenceAutomationId");

-- CreateIndex
CREATE INDEX "EvidenceAutomationRun_status_idx" ON "public"."EvidenceAutomationRun"("status");

-- CreateIndex
CREATE INDEX "EvidenceAutomationRun_createdAt_idx" ON "public"."EvidenceAutomationRun"("createdAt");

-- CreateIndex
CREATE INDEX "EvidenceAutomation_taskId_idx" ON "public"."EvidenceAutomation"("taskId");

-- AddForeignKey
ALTER TABLE "public"."EvidenceAutomationRun" ADD CONSTRAINT "EvidenceAutomationRun_evidenceAutomationId_fkey" FOREIGN KEY ("evidenceAutomationId") REFERENCES "public"."EvidenceAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvidenceAutomationRun" ADD CONSTRAINT "EvidenceAutomationRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvidenceAutomation" ADD CONSTRAINT "EvidenceAutomation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
