-- ISMS document versioning & history (CS-701)
-- Brings ISMS documents onto the Policies versioning model: a published-version
-- pointer + working-draft fields on the parent, and per-version publish metadata +
-- an immutable content snapshot on the version.

-- AlterTable: working-draft holders + current-published-version pointer.
ALTER TABLE "IsmsDocument" ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "draftNarrative" JSONB,
ADD COLUMN     "draftSnapshot" JSONB;

-- AlterTable: per-version changelog + immutable rendered-content snapshot.
ALTER TABLE "IsmsDocumentVersion" ADD COLUMN     "changelog" TEXT,
ADD COLUMN     "contentSnapshot" JSONB;

-- ---------------------------------------------------------------------------
-- Data backfill. Runs BEFORE the new indexes/constraints so the legacy-row
-- cleanup can never trip foreign-key validation. ISMS is pre-GA (flag-gated),
-- so volumes are tiny.
-- ---------------------------------------------------------------------------

-- 1. Move the working narrative + drift baseline off the (previously single)
--    version row onto the parent document, which now holds the editable draft.
UPDATE "IsmsDocument" d
SET "draftNarrative" = v."narrative",
    "draftSnapshot"  = v."sourceSnapshot"
FROM "IsmsDocumentVersion" v
WHERE v."documentId" = d."id" AND v."isLatest" = true;

-- 2. The pre-CS-701 version row was only ever a mutable draft holder with no
--    frozen contentSnapshot, so it cannot serve as an immutable published version
--    (a snapshot-less "current version" would 404 on export). Drop every legacy
--    row; its content is preserved on the parent by step 1.
--
--    Approvals are intentionally preserved: `currentVersionId` stays null, so an
--    approved document keeps its status and simply exports its (unchanged) current
--    content on demand until its next approval captures a real versioned artifact.
--    From here on a published version is ONLY created by the approve flow, which
--    always writes a contentSnapshot — so currentVersionId never points at a
--    snapshot-less version. This DELETE also clears the legacy (always-null)
--    `publishedById` values before the FK below is added.
DELETE FROM "IsmsDocumentVersion";

-- CreateIndex
CREATE UNIQUE INDEX "IsmsDocument_currentVersionId_key" ON "IsmsDocument"("currentVersionId");

-- CreateIndex
CREATE INDEX "IsmsDocumentVersion_documentId_publishedAt_idx" ON "IsmsDocumentVersion"("documentId", "publishedAt");

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "IsmsDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocumentVersion" ADD CONSTRAINT "IsmsDocumentVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
