-- AlterTable
ALTER TABLE "KnowledgeBaseDocument" ADD COLUMN "triggerRunId" TEXT;

-- CreateIndex
CREATE INDEX "KnowledgeBaseDocument_triggerRunId_idx" ON "KnowledgeBaseDocument"("triggerRunId");
