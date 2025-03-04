-- AlterTable
ALTER TABLE "OrganizationControlRequirement" ADD COLUMN     "organizationPolicyId" TEXT;

-- AddForeignKey
ALTER TABLE "OrganizationControlRequirement" ADD CONSTRAINT "OrganizationControlRequirement_organizationPolicyId_fkey" FOREIGN KEY ("organizationPolicyId") REFERENCES "OrganizationPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;