-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttachmentEntityType" ADD VALUE 'employment_onboard';
ALTER TYPE "AttachmentEntityType" ADD VALUE 'employment_offboard';

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "offboardDate" TIMESTAMP(3),
ADD COLUMN     "onboardDate" TIMESTAMP(3);
