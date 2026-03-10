-- AlterTable
ALTER TABLE "organization_role" ADD COLUMN "obligations" TEXT NOT NULL DEFAULT '{}';

-- Migrate: copy compliance flag from permissions JSON into obligations column
UPDATE "organization_role"
SET obligations = '{"compliance":true}'
WHERE permissions::jsonb ? 'compliance';

-- Migrate: remove compliance key from permissions JSON
UPDATE "organization_role"
SET permissions = (permissions::jsonb - 'compliance')::text
WHERE permissions::jsonb ? 'compliance';
