-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "evidenceSubmissionId" TEXT,
ALTER COLUMN "taskId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Finding_evidenceSubmissionId_idx" ON "Finding"("evidenceSubmissionId");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_evidenceSubmissionId_fkey" FOREIGN KEY ("evidenceSubmissionId") REFERENCES "EvidenceSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
