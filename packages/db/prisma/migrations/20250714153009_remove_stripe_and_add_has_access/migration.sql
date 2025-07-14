/*
  Warnings:

  - You are about to drop the column `hadCall` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionData` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionType` on the `Organization` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Organization_stripeCustomerId_idx";

-- DropIndex
DROP INDEX "Organization_subscriptionType_idx";

-- Add hasAccess column
ALTER TABLE "Organization" ADD COLUMN "hasAccess" BOOLEAN NOT NULL DEFAULT false;

-- Update all organizations to have access depending on subscription type
UPDATE "Organization" SET "hasAccess" = true WHERE "subscriptionType" = 'FREE';
UPDATE "Organization" SET "hasAccess" = true WHERE "subscriptionType" = 'STARTER';
UPDATE "Organization" SET "hasAccess" = true WHERE "subscriptionType" = 'MANAGED';

-- Drop columns
ALTER TABLE "Organization" DROP COLUMN "hadCall";
ALTER TABLE "Organization" DROP COLUMN "stripeCustomerId";
ALTER TABLE "Organization" DROP COLUMN "stripeSubscriptionData";
ALTER TABLE "Organization" DROP COLUMN "subscriptionType";

-- Drop subscription type enum
DROP TYPE "SubscriptionType";