-- Historical evaluations have no verifiable criteria snapshot. Do not backfill.
ALTER TABLE "EvidenceAutomationRun" ADD COLUMN "evaluationCriteriaSnapshot" TEXT;
