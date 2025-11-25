-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailNotificationsUnsubscribed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailPreferences" JSONB DEFAULT '{"policyNotifications":true,"taskReminders":true,"weeklyTaskDigest":true,"unassignedItemsNotifications":true}';
