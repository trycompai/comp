-- DynamicCheck edit history: a snapshot of a check's logic (definition + variables)
-- taken before each change, so edits (manual, API, or self-heal agent) can be rolled
-- back and audited. Additive only — does not alter DynamicCheck or any existing flow.

-- CreateTable
CREATE TABLE "DynamicCheckVersion" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('dckv'::text),
    "checkId" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "variables" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'api',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DynamicCheckVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Composite serves the only read pattern (versions for one check, newest first)
-- and its leading checkId column also indexes the FK for cascade deletes.
CREATE INDEX "DynamicCheckVersion_checkId_createdAt_idx" ON "DynamicCheckVersion"("checkId", "createdAt");

-- AddForeignKey
ALTER TABLE "DynamicCheckVersion" ADD CONSTRAINT "DynamicCheckVersion_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "DynamicCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
