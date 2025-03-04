-- AlterTable
ALTER TABLE "OrganizationControlRequirement" ADD COLUMN     "organizationEvidenceId" TEXT;

-- AddForeignKey
ALTER TABLE "OrganizationControlRequirement" ADD CONSTRAINT "OrganizationControlRequirement_organizationEvidenceId_fkey" FOREIGN KEY ("organizationEvidenceId") REFERENCES "OrganizationEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
