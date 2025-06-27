/*
  Warnings:

  - You are about to drop the column `completed` on the `Onboarding` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Onboarding" AS o
ADD COLUMN "triggerJobCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Copy existing values from completed to triggerJobCompleted
UPDATE "Onboarding" AS o SET "triggerJobCompleted" = o."completed";

-- Drop the old column
ALTER TABLE "Onboarding" AS o DROP COLUMN "completed";
