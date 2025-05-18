-- AlterTable
ALTER TABLE "FrameworkInstance" ALTER COLUMN "frameworkId" TYPE TEXT USING "frameworkId"::TEXT;

-- AlterTable
ALTER TABLE "RequirementMap" ALTER COLUMN "requirementId" TYPE TEXT USING "requirementId"::TEXT;
