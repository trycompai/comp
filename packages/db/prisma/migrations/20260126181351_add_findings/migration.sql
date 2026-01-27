-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('soc2', 'iso27001');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('open', 'ready_for_review', 'needs_revision', 'closed');

-- CreateTable
CREATE TABLE "FindingTemplate" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fnd_t'::text),
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FindingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fnd'::text),
    "type" "FindingType" NOT NULL DEFAULT 'soc2',
    "status" "FindingStatus" NOT NULL DEFAULT 'open',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "templateId" TEXT,
    "createdById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Finding_taskId_idx" ON "Finding"("taskId");

-- CreateIndex
CREATE INDEX "Finding_organizationId_status_idx" ON "Finding"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FindingTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
