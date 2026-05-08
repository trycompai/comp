ALTER TABLE "background_check_requests"
  ADD COLUMN "reportSnapshot" JSONB,
  ADD COLUMN "reportSyncedAt" TIMESTAMP(3);
