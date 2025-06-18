-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "slug" SET DEFAULT generate_prefixed_cuid('slug'::text),
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
