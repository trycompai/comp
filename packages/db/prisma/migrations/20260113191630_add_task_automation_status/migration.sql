-- CreateEnum
CREATE TYPE "TaskAutomationStatus" AS ENUM ('AUTOMATED', 'MANUAL');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "automationStatus" "TaskAutomationStatus" NOT NULL DEFAULT 'AUTOMATED';
