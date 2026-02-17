-- CreateEnum
CREATE TYPE "EvidenceFormType" AS ENUM (
  'board-meeting',
  'it-leadership-meeting',
  'risk-committee-meeting',
  'meeting',
  'access-request',
  'whistleblower-report',
  'penetration-test',
  'rbac-matrix',
  'infrastructure-inventory',
  'employee-performance-evaluation'
);

-- Validate existing EvidenceSubmission values before cast
DO $$
DECLARE
  invalid_values TEXT;
BEGIN
  SELECT string_agg(DISTINCT "formType", ', ')
  INTO invalid_values
  FROM "EvidenceSubmission"
  WHERE "formType" NOT IN (
    'board-meeting',
    'it-leadership-meeting',
    'risk-committee-meeting',
    'meeting',
    'access-request',
    'whistleblower-report',
    'penetration-test',
    'rbac-matrix',
    'infrastructure-inventory',
    'employee-performance-evaluation'
  );

  IF invalid_values IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot migrate EvidenceSubmission.formType to enum. Invalid values: %', invalid_values;
  END IF;
END $$;

-- Validate existing Finding values before cast
DO $$
DECLARE
  invalid_values TEXT;
BEGIN
  SELECT string_agg(DISTINCT "evidenceFormType", ', ')
  INTO invalid_values
  FROM "Finding"
  WHERE "evidenceFormType" IS NOT NULL
    AND "evidenceFormType" NOT IN (
      'board-meeting',
      'it-leadership-meeting',
      'risk-committee-meeting',
      'meeting',
      'access-request',
      'whistleblower-report',
      'penetration-test',
      'rbac-matrix',
      'infrastructure-inventory',
      'employee-performance-evaluation'
    );

  IF invalid_values IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot migrate Finding.evidenceFormType to enum. Invalid values: %', invalid_values;
  END IF;
END $$;

-- AlterTable
ALTER TABLE "EvidenceSubmission"
  ALTER COLUMN "formType" TYPE "EvidenceFormType"
  USING ("formType"::"EvidenceFormType");

-- AlterTable
ALTER TABLE "Finding"
  ALTER COLUMN "evidenceFormType" TYPE "EvidenceFormType"
  USING ("evidenceFormType"::"EvidenceFormType");
