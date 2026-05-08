-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "treatmentStrategy" "RiskTreatmentType" NOT NULL DEFAULT 'accept',
ADD COLUMN     "treatmentStrategyDescription" TEXT;
