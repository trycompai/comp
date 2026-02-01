/*
  Warnings:

  - A unique constraint covering the columns `[currentVersionId]` on the table `Policy` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "draftContent" JSONB[] DEFAULT ARRAY[]::JSONB[];

-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('pv'::text),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "policyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB[],
    "pdfUrl" TEXT,
    "publishedById" TEXT,
    "changelog" TEXT,

    CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyVersion_policyId_idx" ON "PolicyVersion"("policyId");

-- CreateIndex
CREATE INDEX "PolicyVersion_createdAt_idx" ON "PolicyVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_policyId_version_key" ON "PolicyVersion"("policyId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_currentVersionId_key" ON "Policy"("currentVersionId");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "PolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
