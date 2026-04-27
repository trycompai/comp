/*
  Warnings:

  - You are about to drop the column `schedule` on the `BrowserAutomation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BrowserAutomation" DROP COLUMN "schedule",
ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "scheduleFrequency" "TaskFrequency" NOT NULL DEFAULT 'daily';

-- AlterTable
ALTER TABLE "EvidenceAutomation" ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "scheduleFrequency" "TaskFrequency" NOT NULL DEFAULT 'daily';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "integrationLastRunAt" TIMESTAMP(3),
ADD COLUMN     "integrationScheduleFrequency" "TaskFrequency" NOT NULL DEFAULT 'daily';
