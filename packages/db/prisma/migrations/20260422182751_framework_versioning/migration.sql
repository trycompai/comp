-- CreateEnum
CREATE TYPE "FrameworkSyncOperationKind" AS ENUM ('SYNC', 'ROLLBACK');

-- AlterTable
ALTER TABLE "Control" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FrameworkInstance" ADD COLUMN     "currentVersionId" TEXT;

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RequirementMap" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FrameworkSyncOperation" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fso'::text),
    "frameworkInstanceId" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "kind" "FrameworkSyncOperationKind" NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" TEXT,
    "rollbackExpiresAt" TIMESTAMP(3),
    "rolledBackByOperationId" TEXT,
    "undoPayload" JSONB NOT NULL,
    "summary" JSONB NOT NULL,

    CONSTRAINT "FrameworkSyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkVersion" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fvr'::text),
    "frameworkId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedById" TEXT,
    "releaseNotes" TEXT,
    "manifest" JSONB NOT NULL,

    CONSTRAINT "FrameworkVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkSyncOperation_rolledBackByOperationId_key" ON "FrameworkSyncOperation"("rolledBackByOperationId");

-- CreateIndex
CREATE INDEX "FrameworkSyncOperation_frameworkInstanceId_performedAt_idx" ON "FrameworkSyncOperation"("frameworkInstanceId", "performedAt");

-- CreateIndex
CREATE INDEX "FrameworkSyncOperation_frameworkInstanceId_kind_idx" ON "FrameworkSyncOperation"("frameworkInstanceId", "kind");

-- CreateIndex
CREATE INDEX "FrameworkVersion_frameworkId_publishedAt_idx" ON "FrameworkVersion"("frameworkId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkVersion_frameworkId_version_key" ON "FrameworkVersion"("frameworkId", "version");

-- CreateIndex
CREATE INDEX "Control_organizationId_archivedAt_idx" ON "Control"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "FrameworkInstance_currentVersionId_idx" ON "FrameworkInstance"("currentVersionId");

-- CreateIndex
CREATE INDEX "Policy_organizationId_archivedAt_idx" ON "Policy"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "RequirementMap_frameworkInstanceId_archivedAt_idx" ON "RequirementMap"("frameworkInstanceId", "archivedAt");

-- CreateIndex
CREATE INDEX "Task_organizationId_archivedAt_idx" ON "Task"("organizationId", "archivedAt");

-- AddForeignKey
ALTER TABLE "FrameworkSyncOperation" ADD CONSTRAINT "FrameworkSyncOperation_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkSyncOperation" ADD CONSTRAINT "FrameworkSyncOperation_fromVersionId_fkey" FOREIGN KEY ("fromVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkSyncOperation" ADD CONSTRAINT "FrameworkSyncOperation_toVersionId_fkey" FOREIGN KEY ("toVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkSyncOperation" ADD CONSTRAINT "FrameworkSyncOperation_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkSyncOperation" ADD CONSTRAINT "FrameworkSyncOperation_rolledBackByOperationId_fkey" FOREIGN KEY ("rolledBackByOperationId") REFERENCES "FrameworkSyncOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkVersion" ADD CONSTRAINT "FrameworkVersion_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkVersion" ADD CONSTRAINT "FrameworkVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkInstance" ADD CONSTRAINT "FrameworkInstance_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
