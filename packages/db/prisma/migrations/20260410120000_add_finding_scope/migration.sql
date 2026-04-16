-- CreateEnum
CREATE TYPE "FindingScope" AS ENUM ('people', 'people_tasks', 'people_devices', 'people_chart');

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN "scope" "FindingScope";
