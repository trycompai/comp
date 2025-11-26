-- Update existing users who have NULL emailPreferences to the default value
UPDATE "public"."User"
SET "emailPreferences" = '{"policyNotifications":true,"taskReminders":true,"weeklyTaskDigest":true,"unassignedItemsNotifications":true}'::jsonb
WHERE "emailPreferences" IS NULL;