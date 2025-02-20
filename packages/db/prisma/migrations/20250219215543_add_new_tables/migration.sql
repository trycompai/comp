-- AlterTable
ALTER TABLE "portal_user" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "portal_user" ADD CONSTRAINT "portal_user_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
