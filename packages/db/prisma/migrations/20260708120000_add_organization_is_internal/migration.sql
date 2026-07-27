-- Mark platform-operated ("internal") organizations, e.g. Comp AI's own org.
-- When true, platform admins are treated as real participants of the org
-- (assignable, counted in compliance, notified). Defaults to false so every
-- existing and future customer org keeps excluding platform-admin staff.
ALTER TABLE "Organization"
  ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;
