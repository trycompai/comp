-- CreateEnum
CREATE TYPE "PolicyVisibility" AS ENUM ('ALL', 'DEPARTMENT');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'program_manager';

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "visibility" "PolicyVisibility" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "visibleToDepartments" "Departments"[] DEFAULT ARRAY[]::"Departments"[];
