-- Policy: rows in "organization_role" named after a built-in role are
-- obligation overrides, not custom roles. Permissions for a built-in name
-- always come from the code-defined BUILT_IN_ROLE_PERMISSIONS map, so an
-- override row stores no permissions of its own; a permission blob on such a
-- row would become an assignable custom role the moment the row is renamed.
--
-- Idempotent: re-running rewrites the same value.

BEGIN;

UPDATE "organization_role"
SET "permissions" = '{}'
WHERE "name" IN ('owner', 'admin', 'auditor', 'employee', 'contractor');

COMMIT;
