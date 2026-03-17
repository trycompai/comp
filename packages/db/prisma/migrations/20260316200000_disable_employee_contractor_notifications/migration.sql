-- Disable non-portal notifications for employee and contractor roles.
-- These roles only access the portal (policies + training), so they should
-- not receive task, mention, digest, or finding notifications.

-- 1. Update existing saved settings
UPDATE "role_notification_setting"
SET
  "taskReminders" = false,
  "taskAssignments" = false,
  "taskMentions" = false,
  "weeklyTaskDigest" = false,
  "findingNotifications" = false,
  "updatedAt" = now()
WHERE "role" IN ('employee', 'contractor');

-- 2. Insert settings for orgs that don't have saved employee/contractor settings yet,
--    so they don't rely on (now-changed) code defaults
INSERT INTO "role_notification_setting" (
  "id",
  "organizationId",
  "role",
  "policyNotifications",
  "taskReminders",
  "taskAssignments",
  "taskMentions",
  "weeklyTaskDigest",
  "findingNotifications",
  "createdAt",
  "updatedAt"
)
SELECT
  generate_prefixed_cuid('rns'::text),
  o."id",
  r.role,
  true,   -- policyNotifications
  false,  -- taskReminders
  false,  -- taskAssignments
  false,  -- taskMentions
  false,  -- weeklyTaskDigest
  false,  -- findingNotifications
  now(),
  now()
FROM "Organization" o
CROSS JOIN (VALUES ('employee'), ('contractor')) AS r(role)
WHERE NOT EXISTS (
  SELECT 1 FROM "role_notification_setting" rns
  WHERE rns."organizationId" = o."id" AND rns."role" = r.role
);
