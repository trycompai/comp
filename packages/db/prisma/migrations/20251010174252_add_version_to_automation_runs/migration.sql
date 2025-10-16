-- AlterTable
ALTER TABLE "public"."EvidenceAutomationRun" ADD COLUMN     "version" INTEGER;

-- CreateIndex
CREATE INDEX "EvidenceAutomationRun_version_idx" ON "public"."EvidenceAutomationRun"("version");
