-- Extend FindingArea with general buckets so an auditor can log a
-- "no risks tracked" / "missing policy" / "no vendor inventory" finding
-- without picking a specific Risk / Policy / Vendor row.
--
-- Each ADD VALUE is a separate ALTER TYPE because Postgres 12+ disallows
-- using a newly-added enum value in the same transaction it was added, and
-- Prisma wraps each migration file in a transaction. The `IF NOT EXISTS`
-- guard keeps this idempotent for anyone who already patched locally.
ALTER TYPE "FindingArea" ADD VALUE IF NOT EXISTS 'risks';
ALTER TYPE "FindingArea" ADD VALUE IF NOT EXISTS 'vendors';
ALTER TYPE "FindingArea" ADD VALUE IF NOT EXISTS 'policies';
