/*
  Warnings:

  - Made the column `name` on table `ControlRequirement` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
UPDATE "ControlRequirement" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "ControlRequirement" ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "name" SET DEFAULT '';
