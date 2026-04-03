-- AlterTable
-- Change permissions from jsonb to text so better-auth receives a raw JSON string
-- (Prisma auto-parses jsonb, but better-auth calls JSON.parse() itself)
-- The cast from jsonb to text produces valid JSON strings.
ALTER TABLE "organization_role" ALTER COLUMN "permissions" SET DATA TYPE TEXT USING permissions::TEXT;
