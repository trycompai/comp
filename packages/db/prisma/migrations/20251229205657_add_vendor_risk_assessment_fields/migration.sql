-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "riskAssessmentData" JSONB,
ADD COLUMN     "riskAssessmentUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "riskAssessmentVersion" TEXT;
