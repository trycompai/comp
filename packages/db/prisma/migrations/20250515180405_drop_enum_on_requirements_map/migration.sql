-- AlterTable
ALTER TABLE "RequirementMap" ALTER COLUMN "requirementId" TYPE TEXT USING "requirementId"::TEXT;

-- DropEnum
DROP TYPE "RequirementId";
