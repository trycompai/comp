-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('monthly', 'quarterly', 'yearly');

-- AlterTable
ALTER TABLE "OrganizationEvidence" ADD COLUMN     "frequency" "Frequency",
ADD COLUMN     "lastPublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrganizationPolicy" ADD COLUMN     "frequency" "Frequency",
ADD COLUMN     "lastPublishedAt" TIMESTAMP(3);
