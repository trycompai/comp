-- Add an 'other' bucket to FindingArea so legacy rows backfilled by
-- 20260419120000_unified_findings can be distinguished from genuine
-- people-area findings. Splitting the ADD VALUE into its own migration
-- because Postgres 12+ disallows using a newly-added enum value in the
-- same transaction in which it was added.
ALTER TYPE "FindingArea" ADD VALUE IF NOT EXISTS 'other';
