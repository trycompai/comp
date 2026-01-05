/*
  Warnings:

  - You are about to drop the column `riskAssessmentData` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `riskAssessmentUpdatedAt` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `riskAssessmentVersion` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GlobalVendors" ADD COLUMN     "riskAssessmentData" JSONB,
ADD COLUMN     "riskAssessmentUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "riskAssessmentVersion" TEXT;

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "riskAssessmentData",
DROP COLUMN "riskAssessmentUpdatedAt",
DROP COLUMN "riskAssessmentVersion";
