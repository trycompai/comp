-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'in_review';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "evidenceApprovalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approverId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
