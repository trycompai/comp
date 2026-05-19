/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,connectionId,checkId,resourceId]` on the table `FindingException` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "FindingException_checkId_resourceId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "FindingException_organizationId_connectionId_checkId_resour_key" ON "FindingException"("organizationId", "connectionId", "checkId", "resourceId");
