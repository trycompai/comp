-- AlterTable
ALTER TABLE "RemediationAction" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgmentText" TEXT,
ADD COLUMN     "riskLevel" TEXT;
