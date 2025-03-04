-- AlterTable
ALTER TABLE "OrganizationPolicy" ADD COLUMN     "department" "Departments",
ADD COLUMN     "ownerId" TEXT;

-- AddForeignKey
ALTER TABLE "OrganizationPolicy" ADD CONSTRAINT "OrganizationPolicy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
