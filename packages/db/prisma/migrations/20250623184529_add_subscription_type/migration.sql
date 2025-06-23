-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('NONE', 'SELF_SERVE', 'STRIPE');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "stripeSubscriptionData" JSONB,
ADD COLUMN     "subscriptionType" "SubscriptionType" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "Organization_subscriptionType_idx" ON "Organization"("subscriptionType");

-- CreateIndex
CREATE INDEX "Organization_stripeCustomerId_idx" ON "Organization"("stripeCustomerId");
