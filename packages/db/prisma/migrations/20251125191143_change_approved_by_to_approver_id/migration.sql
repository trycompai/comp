-- AlterEnum: Add needs_review status
ALTER TYPE "SOADocumentStatus" ADD VALUE 'needs_review';

-- AlterTable: Rename approvedBy to approverId and change to reference Member
ALTER TABLE "SOADocument" RENAME COLUMN "approvedBy" TO "approverId";

-- AddForeignKey: Add relation to Member
ALTER TABLE "SOADocument" ADD CONSTRAINT "SOADocument_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

