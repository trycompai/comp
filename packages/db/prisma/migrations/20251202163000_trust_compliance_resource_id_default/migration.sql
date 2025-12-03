-- Ensure TrustComplianceResource IDs are generated automatically
ALTER TABLE "TrustComplianceResource"
ALTER COLUMN "id" SET DEFAULT generate_prefixed_cuid('tcr'::text);

