-- Extend FindingType beyond SOC 2 / ISO 27001 so orgs subscribed to the other
-- platform frameworks (PCI DSS, HIPAA, GDPR, ISO 9001, ISO 42001) can log
-- findings against them in-app instead of resorting to manual tracking.
--
-- Each ADD VALUE is a separate ALTER TYPE because Postgres 12+ disallows
-- using a newly-added enum value in the same transaction it was added, and
-- Prisma wraps each migration file in a transaction. The `IF NOT EXISTS`
-- guard keeps this idempotent for anyone who already patched locally.
ALTER TYPE "FindingType" ADD VALUE IF NOT EXISTS 'pci_dss';
ALTER TYPE "FindingType" ADD VALUE IF NOT EXISTS 'hipaa';
ALTER TYPE "FindingType" ADD VALUE IF NOT EXISTS 'gdpr';
ALTER TYPE "FindingType" ADD VALUE IF NOT EXISTS 'iso9001';
ALTER TYPE "FindingType" ADD VALUE IF NOT EXISTS 'iso42001';
