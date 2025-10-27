-- CreateEnum
CREATE TYPE "public"."EvidenceAutomationEvaluationStatus" AS ENUM ('pass', 'fail');

-- AlterTable
ALTER TABLE "public"."EvidenceAutomation" ADD COLUMN     "evaluationCriteria" TEXT;

-- AlterTable
ALTER TABLE "public"."EvidenceAutomationRun" ADD COLUMN     "evaluationReason" TEXT,
ADD COLUMN     "evaluationStatus" "public"."EvidenceAutomationEvaluationStatus";
