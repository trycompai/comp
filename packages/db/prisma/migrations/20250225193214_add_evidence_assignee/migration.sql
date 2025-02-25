-- AlterTable
ALTER TABLE "OrganizationEvidence" ADD COLUMN     "assigneeId" TEXT;

-- CreateIndex
CREATE INDEX "OrganizationEvidence_assigneeId_idx" ON "OrganizationEvidence"("assigneeId");

-- AddForeignKey
ALTER TABLE "OrganizationEvidence" ADD CONSTRAINT "OrganizationEvidence_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
