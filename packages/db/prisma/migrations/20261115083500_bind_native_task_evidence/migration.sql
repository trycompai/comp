-- Historical runs do not prove the configuration or source actually executed.
-- Keep them unknown; never backfill a fabricated binding.
ALTER TABLE "IntegrationCheckRun" ADD COLUMN "completionEvidenceBinding" TEXT;
