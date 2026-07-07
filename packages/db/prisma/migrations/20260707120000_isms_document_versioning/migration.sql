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

-- 2. The pre-CS-701 version row was only ever a mutable draft holder — it has no
--    frozen contentSnapshot, so it cannot serve as an immutable published version
--    (a snapshot-less "current version" would 404 on export). Revert previously
--    approved documents to draft so they are re-approved once to establish a real
--    v1 (with a proper snapshot + retained artifacts), and drop every legacy row.
--    From here on a published version is ONLY created by the approve flow, which
--    always writes a contentSnapshot — so currentVersionId never points at a
--    snapshot-less version.
UPDATE "IsmsDocument"
SET "status" = 'draft',
    "approvedAt" = NULL,
    "approverId" = NULL,
    "declinedAt" = NULL
WHERE "status" = 'approved';

DELETE FROM "IsmsDocumentVersion";
