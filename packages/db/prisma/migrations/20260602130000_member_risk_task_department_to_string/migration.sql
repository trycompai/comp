-- AlterTable: Member.department — convert enum column to TEXT, preserve "none" default
ALTER TABLE "Member" ALTER COLUMN "department" DROP DEFAULT;
ALTER TABLE "Member" ALTER COLUMN "department" TYPE TEXT USING "department"::TEXT;
ALTER TABLE "Member" ALTER COLUMN "department" SET DEFAULT 'none';

-- AlterTable: Risk.department — convert nullable enum column to TEXT (no default)
ALTER TABLE "Risk" ALTER COLUMN "department" TYPE TEXT USING "department"::TEXT;

-- AlterTable: Task.department — convert nullable enum column to TEXT, preserve "none" default
ALTER TABLE "Task" ALTER COLUMN "department" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "department" TYPE TEXT USING "department"::TEXT;
ALTER TABLE "Task" ALTER COLUMN "department" SET DEFAULT 'none';
