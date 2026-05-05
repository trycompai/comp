-- Add SOC 3 support to the trust portal:
--   * new `soc3` value on the `TrustFramework` enum (used by TrustResource)
--   * new `soc3` and `soc3_status` columns on the `Trust` model
--
-- Safe to combine these in a single migration because `soc3_status` uses the
-- pre-existing `FrameworkStatus` enum — the newly-added `TrustFramework.soc3`
-- value is not referenced in any statement in this file.
ALTER TYPE "TrustFramework" ADD VALUE IF NOT EXISTS 'soc3';

ALTER TABLE "Trust"
  ADD COLUMN "soc3" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "soc3_status" "FrameworkStatus" NOT NULL DEFAULT 'started';
