-- CreateEnum
CREATE TYPE "KnowledgeBaseDocumentProcessingStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "KnowledgeBaseDocument" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('kbd'::text),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "s3Key" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "processingStatus" "KnowledgeBaseDocumentProcessingStatus" NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeBaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeBaseDocument_organizationId_idx" ON "KnowledgeBaseDocument"("organizationId");

-- CreateIndex
CREATE INDEX "KnowledgeBaseDocument_organizationId_processingStatus_idx" ON "KnowledgeBaseDocument"("organizationId", "processingStatus");

-- CreateIndex
CREATE INDEX "KnowledgeBaseDocument_s3Key_idx" ON "KnowledgeBaseDocument"("s3Key");

-- AddForeignKey
ALTER TABLE "KnowledgeBaseDocument" ADD CONSTRAINT "KnowledgeBaseDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
