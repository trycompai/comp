-- DropForeignKey
ALTER TABLE "OrganizationEvidence" DROP CONSTRAINT "OrganizationEvidence_assigneeId_fkey";

-- AddForeignKey
ALTER TABLE "OrganizationEvidence" ADD CONSTRAINT "OrganizationEvidence_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
