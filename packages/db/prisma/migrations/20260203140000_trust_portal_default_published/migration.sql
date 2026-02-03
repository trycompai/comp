-- Trust Portal: Change default status to 'published' and migrate existing records

-- Update all existing draft trust portal records to published
UPDATE "Trust" SET "status" = 'published' WHERE "status" = 'draft';

-- Backfill friendlyUrl with organizationId for any records where it's NULL
UPDATE "Trust" SET "friendlyUrl" = "organizationId" WHERE "friendlyUrl" IS NULL;

-- Change the default value for the status column from 'draft' to 'published'
ALTER TABLE "Trust" ALTER COLUMN "status" SET DEFAULT 'published'::"TrustStatus";
