-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "evidenceFormType" TEXT;

-- CreateIndex
CREATE INDEX "Finding_evidenceFormType_idx" ON "Finding"("evidenceFormType");
