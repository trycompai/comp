-- Store the Statement of Applicability applicability decision per organization
-- (on the answer) instead of on the shared, framework-level configuration.
ALTER TABLE "SOAAnswer" ADD COLUMN "isApplicable" BOOLEAN;
