-- AlterTable
ALTER TABLE "IntegrationCheckRun" ADD COLUMN     "scanMode" TEXT;

-- Backfill: label pre-feature AWS cloud-security runs as 'comp_scanners'.
-- That was the only scan engine in existence when those runs executed, so
-- the label is truthful — we're filling in metadata that didn't exist
-- before, not changing semantics. Lets the new reconciliation lookup
-- (which scopes by scanMode) match historical AWS runs against the first
-- post-deploy scan instead of treating it as a fresh baseline and
-- silently dropping one cycle of resolution / regression events.
--
-- WHY this WHERE clause is precise:
--   - 'aws-security-scan' is the only checkId pattern used by cloud-
--     security scans (cloud-security.service.ts:619 — verified by grep).
--   - Other IntegrationCheckRun rows (connection-level checks with
--     checkId='all', task-based checks with manifest IDs) do NOT have a
--     scan-mode concept and correctly stay NULL.
--   - GCP / Azure cloud-security runs ('gcp-security-scan' /
--     'azure-security-scan') also stay NULL — scan mode is AWS-only.
UPDATE "IntegrationCheckRun"
SET "scanMode" = 'comp_scanners'
WHERE "checkId" = 'aws-security-scan'
  AND "scanMode" IS NULL;
