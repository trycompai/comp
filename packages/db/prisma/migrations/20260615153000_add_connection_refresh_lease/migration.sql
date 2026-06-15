-- AlterTable
-- Lease column to serialize concurrent OAuth token refreshes per connection.
-- Nullable with no default: instant, metadata-only change (no table rewrite).
ALTER TABLE "IntegrationConnection" ADD COLUMN     "refreshLeaseUntil" TIMESTAMP(3);
