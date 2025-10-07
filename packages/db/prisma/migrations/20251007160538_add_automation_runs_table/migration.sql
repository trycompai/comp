-- CreateEnum
CREATE TYPE "public"."evidence_automation_run_status" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."evidence_automation_trigger" AS ENUM ('manual', 'scheduled', 'api');

-- AlterTable
ALTER TABLE "public"."EvidenceAutomation" ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "public"."evidence_automation_runs" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ear'::text),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "evidence_automation_id" TEXT NOT NULL,
    "status" "public"."evidence_automation_run_status" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "success" BOOLEAN,
    "error" TEXT,
    "logs" JSONB,
    "output" JSONB,
    "triggered_by" "public"."evidence_automation_trigger" NOT NULL DEFAULT 'scheduled',
    "run_duration" INTEGER,
    "taskId" TEXT,

    CONSTRAINT "evidence_automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidence_automation_runs_evidence_automation_id_idx" ON "public"."evidence_automation_runs"("evidence_automation_id");

-- CreateIndex
CREATE INDEX "evidence_automation_runs_status_idx" ON "public"."evidence_automation_runs"("status");

-- CreateIndex
CREATE INDEX "evidence_automation_runs_created_at_idx" ON "public"."evidence_automation_runs"("created_at");

-- CreateIndex
CREATE INDEX "EvidenceAutomation_taskId_idx" ON "public"."EvidenceAutomation"("taskId");

-- CreateIndex
CREATE INDEX "EvidenceAutomation_status_idx" ON "public"."EvidenceAutomation"("status");

-- CreateIndex
CREATE INDEX "EvidenceAutomation_lastRunAt_idx" ON "public"."EvidenceAutomation"("lastRunAt");

-- AddForeignKey
ALTER TABLE "public"."evidence_automation_runs" ADD CONSTRAINT "evidence_automation_runs_evidence_automation_id_fkey" FOREIGN KEY ("evidence_automation_id") REFERENCES "public"."EvidenceAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evidence_automation_runs" ADD CONSTRAINT "evidence_automation_runs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
