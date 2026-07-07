-- ISMS document versioning & history (CS-701)
-- Brings ISMS documents onto the Policies versioning model: a published-version
-- pointer + working-draft fields on the parent, per-version publish metadata +
-- an immutable content snapshot on the version, then a backfill of existing rows.

-- AlterTable: working-draft holders + current-published-version pointer.
ALTER TABLE "IsmsDocument" ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "draftNarrative" JSONB,
ADD COLUMN     "draftSnapshot" JSONB;

-- AlterTable: per-version changelog + immutable rendered-content snapshot.
ALTER TABLE "IsmsDocumentVersion" ADD COLUMN     "changelog" TEXT,
ADD COLUMN     "contentSnapshot" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "IsmsDocument_currentVersionId_key" ON "IsmsDocument"("currentVersionId");

-- CreateIndex
CREATE INDEX "IsmsDocumentVersion_documentId_publishedAt_idx" ON "IsmsDocumentVersion"("documentId", "publishedAt");

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "IsmsDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocumentVersion" ADD CONSTRAINT "IsmsDocumentVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Data backfill: migrate the single-mutable-version model onto published+draft.
-- ISMS is pre-GA (flag-gated), so volumes are tiny; the backfill is defensive.
-- ---------------------------------------------------------------------------

-- 1. Move the working narrative + drift baseline off the (previously single)
--    version row onto the parent document, which now holds the editable draft.
UPDATE "IsmsDocument" d
SET "draftNarrative" = v."narrative",
    "draftSnapshot"  = v."sourceSnapshot"
FROM "IsmsDocumentVersion" v
WHERE v."documentId" = d."id" AND v."isLatest" = true;

-- 2. For APPROVED documents, promote the existing latest row to published v1:
--    stamp publish metadata from the document's approval and point currentVersion
--    at it. contentSnapshot stays NULL -> historical export falls back to an
--    on-demand render (draft == published at migration time, so this is faithful).
UPDATE "IsmsDocumentVersion" v
SET "publishedAt"   = COALESCE(d."approvedAt", d."updatedAt"),
    "publishedById" = d."approverId"
FROM "IsmsDocument" d
WHERE v."documentId" = d."id" AND v."isLatest" = true AND d."status" = 'approved';

UPDATE "IsmsDocument" d
SET "currentVersionId" = v."id"
FROM "IsmsDocumentVersion" v
WHERE v."documentId" = d."id" AND v."isLatest" = true AND d."status" = 'approved';

-- 3. For NON-approved documents the latest row was only ever a draft holder; its
--    content now lives on the parent, so drop it. Version rows are henceforth
--    published-only (materialized at approval).
DELETE FROM "IsmsDocumentVersion" v
USING "IsmsDocument" d
WHERE v."documentId" = d."id" AND v."isLatest" = true AND d."status" <> 'approved';
