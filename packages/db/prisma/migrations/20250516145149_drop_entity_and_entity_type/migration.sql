/*
  Warnings:

  - You are about to drop the column `entityId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `Task` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Task_entityId_idx";

-- DropIndex
DROP INDEX "Task_entityId_organizationId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "entityId",
DROP COLUMN "entityType";
