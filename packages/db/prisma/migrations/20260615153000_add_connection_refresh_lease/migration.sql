-- AlterTable
-- Lease columns to serialize concurrent OAuth token refreshes per connection.
-- Nullable with no default: instant, metadata-only change (no table rewrite).
-- refreshLeaseToken records the lease owner so release is ownership-checked.
ALTER TABLE "IntegrationConnection" ADD COLUMN     "refreshLeaseUntil" TIMESTAMP(3),
ADD COLUMN     "refreshLeaseToken" TEXT;
