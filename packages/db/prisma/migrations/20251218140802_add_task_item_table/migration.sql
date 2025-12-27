-- CreateEnum
CREATE TYPE "TaskItemStatus" AS ENUM ('todo', 'in_progress', 'in_review', 'done', 'canceled');

-- CreateEnum
CREATE TYPE "TaskItemPriority" AS ENUM ('urgent', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "TaskItemEntityType" AS ENUM ('vendor', 'risk');

-- CreateTable
CREATE TABLE "TaskItem" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tski'::text),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskItemStatus" NOT NULL DEFAULT 'todo',
    "priority" "TaskItemPriority" NOT NULL DEFAULT 'medium',
    "entityId" TEXT NOT NULL,
    "entityType" "TaskItemEntityType" NOT NULL,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskItem_entityId_entityType_idx" ON "TaskItem"("entityId", "entityType");

-- CreateIndex
CREATE INDEX "TaskItem_organizationId_idx" ON "TaskItem"("organizationId");

-- CreateIndex
CREATE INDEX "TaskItem_assigneeId_idx" ON "TaskItem"("assigneeId");

-- CreateIndex
CREATE INDEX "TaskItem_status_idx" ON "TaskItem"("status");

-- CreateIndex
CREATE INDEX "TaskItem_priority_idx" ON "TaskItem"("priority");

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
