-- AlterTable
ALTER TABLE "Policy" ALTER COLUMN "department" TYPE TEXT USING "department"::TEXT;

-- AlterTable
ALTER TABLE "Policy" ALTER COLUMN "visibleToDepartments" DROP DEFAULT;
ALTER TABLE "Policy" ALTER COLUMN "visibleToDepartments" TYPE TEXT[] USING "visibleToDepartments"::TEXT[];
ALTER TABLE "Policy" ALTER COLUMN "visibleToDepartments" SET DEFAULT ARRAY[]::TEXT[];
