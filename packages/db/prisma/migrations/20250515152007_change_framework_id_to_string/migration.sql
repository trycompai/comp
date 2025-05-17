
-- AlterTable
ALTER TABLE "FrameworkInstance" ALTER COLUMN "frameworkId" TYPE TEXT USING "frameworkId"::TEXT;

-- DropEnum
DROP TYPE "FrameworkId";
