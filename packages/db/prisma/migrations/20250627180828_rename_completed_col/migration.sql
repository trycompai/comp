/*
  Warnings:

  - You are about to drop the column `completed` on the `Onboarding` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Onboarding"
ADD COLUMN IF NOT EXISTS "triggerJobCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Copy existing values from completed to triggerJobCompleted
UPDATE "Onboarding" SET "triggerJobCompleted" = "completed";

-- Drop the old column
ALTER TABLE "Onboarding" DROP COLUMN "completed";
