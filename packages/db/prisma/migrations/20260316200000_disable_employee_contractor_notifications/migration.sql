-- Disable non-portal notifications for employee and contractor roles.
-- These roles only access the portal (policies + training), so they should
-- not receive task, mention, digest, or finding notifications.
--
-- We insert records for ALL built-in roles (not just employee/contractor)
-- so that the union logic in isUserUnsubscribed has complete data when a
-- user holds multiple roles (e.g. employee,admin).

-- 1. Update existing saved settings for employee/contractor
UPDATE "role_notification_setting"
SET
  "taskReminders" = false,
  "taskAssignments" = false,
  "taskMentions" = false,
  "weeklyTaskDigest" = false,
  "findingNotifications" = false,
  "updatedAt" = now()
WHERE "role" IN ('employee', 'contractor');

-- 2. Insert default settings for all built-in roles where no record exists.
--    This ensures the union logic always has complete data for multi-role users.

-- Owner: all notifications ON
INSERT INTO "role_notification_setting" (
  "id", "organizationId", "role",
  "policyNotifications", "taskReminders", "taskAssignments",
  "taskMentions", "weeklyTaskDigest", "findingNotifications",
  "createdAt", "updatedAt"
)
SELECT
  generate_prefixed_cuid('rns'::text), o."id", 'owner',
  true, true, true, true, true, true,
  now(), now()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "role_notification_setting" rns
  WHERE rns."organizationId" = o."id" AND rns."role" = 'owner'
);

-- Admin: all notifications ON
INSERT INTO "role_notification_setting" (
  "id", "organizationId", "role",
  "policyNotifications", "taskReminders", "taskAssignments",
  "taskMentions", "weeklyTaskDigest", "findingNotifications",
  "createdAt", "updatedAt"
)
SELECT
  generate_prefixed_cuid('rns'::text), o."id", 'admin',
  true, true, true, true, true, true,
  now(), now()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "role_notification_setting" rns
  WHERE rns."organizationId" = o."id" AND rns."role" = 'admin'
);

-- Auditor: policy + findings only
INSERT INTO "role_notification_setting" (
  "id", "organizationId", "role",
  "policyNotifications", "taskReminders", "taskAssignments",
  "taskMentions", "weeklyTaskDigest", "findingNotifications",
  "createdAt", "updatedAt"
)
SELECT
  generate_prefixed_cuid('rns'::text), o."id", 'auditor',
  true, false, false, false, false, true,
  now(), now()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "role_notification_setting" rns
  WHERE rns."organizationId" = o."id" AND rns."role" = 'auditor'
);

-- Employee: policy only
INSERT INTO "role_notification_setting" (
  "id", "organizationId", "role",
  "policyNotifications", "taskReminders", "taskAssignments",
  "taskMentions", "weeklyTaskDigest", "findingNotifications",
  "createdAt", "updatedAt"
)
SELECT
  generate_prefixed_cuid('rns'::text), o."id", 'employee',
  true, false, false, false, false, false,
  now(), now()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "role_notification_setting" rns
  WHERE rns."organizationId" = o."id" AND rns."role" = 'employee'
);

-- Contractor: policy only
INSERT INTO "role_notification_setting" (
  "id", "organizationId", "role",
  "policyNotifications", "taskReminders", "taskAssignments",
  "taskMentions", "weeklyTaskDigest", "findingNotifications",
  "createdAt", "updatedAt"
)
SELECT
  generate_prefixed_cuid('rns'::text), o."id", 'contractor',
  true, false, false, false, false, false,
  now(), now()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "role_notification_setting" rns
  WHERE rns."organizationId" = o."id" AND rns."role" = 'contractor'
);
