-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Update existing records to set onboardingCompleted to true
UPDATE "Organization" SET "onboardingCompleted" = true;
