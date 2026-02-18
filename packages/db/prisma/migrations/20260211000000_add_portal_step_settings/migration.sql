-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "deviceAgentStepEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "securityTrainingStepEnabled" BOOLEAN NOT NULL DEFAULT true;
