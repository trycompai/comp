-- CreateEnum with new values
CREATE TYPE "SubscriptionType_new" AS ENUM ('NONE', 'FREE', 'STARTER', 'MANAGED');

-- AlterTable to add new column
ALTER TABLE "Organization" ADD COLUMN "subscriptionType_new" "SubscriptionType_new" NOT NULL DEFAULT 'NONE';

-- Transform data from old column to new column
UPDATE "Organization" 
SET "subscriptionType_new" = 
  CASE 
    WHEN "subscriptionType" = 'NONE' THEN 'NONE'::"SubscriptionType_new"
    WHEN "subscriptionType" = 'SELF_SERVE' THEN 'FREE'::"SubscriptionType_new"
    WHEN "subscriptionType" = 'STRIPE' THEN 'MANAGED'::"SubscriptionType_new"
    ELSE 'NONE'::"SubscriptionType_new"
  END;

-- Drop the old column
ALTER TABLE "Organization" DROP COLUMN "subscriptionType";

-- Rename the new column to the old name
ALTER TABLE "Organization" RENAME COLUMN "subscriptionType_new" TO "subscriptionType";

-- Drop the old enum
DROP TYPE "SubscriptionType";

-- Rename the new enum to the old name
ALTER TYPE "SubscriptionType_new" RENAME TO "SubscriptionType";
