-- Backfill uploaded evidence files onto the form's own file field.
--
-- `uploadSubmission` previously wrote every uploaded file to a hardcoded
-- `evidenceFile` key. The submission detail view renders each field by its
-- declared key, so for a form whose file field is named something else the
-- real field stayed empty and the submission displayed "—" against it — the
-- file surfaced only through the generic "Uploaded Evidence" fallback row.
--
-- Copy the file onto the declared key for the three affected form types, then
-- drop the generic key so the file renders once under its proper field rather
-- than twice. Only rows where the declared key is absent are touched, and the
-- generic key is removed only after confirming the copy matches, so this is
-- idempotent and safe to re-run.
--
-- `whistleblower-report` and `tabletop-exercise` declare a field genuinely
-- called `evidenceFile`, and the form types with no file field at all
-- (meetings, access requests, matrices) rely on the fallback row. Both are
-- left untouched.

-- penetration-test -> pentestReport
UPDATE "EvidenceSubmission"
SET "data" = jsonb_set("data", '{pentestReport}', "data" -> 'evidenceFile')
WHERE "formType" = 'penetration-test'
  AND "data" ? 'evidenceFile'
  AND NOT ("data" ? 'pentestReport');

UPDATE "EvidenceSubmission"
SET "data" = "data" - 'evidenceFile'
WHERE "formType" = 'penetration-test'
  AND "data" ? 'evidenceFile'
  AND "data" -> 'evidenceFile' = "data" -> 'pentestReport';

-- network-diagram -> diagramFile
UPDATE "EvidenceSubmission"
SET "data" = jsonb_set("data", '{diagramFile}', "data" -> 'evidenceFile')
WHERE "formType" = 'network-diagram'
  AND "data" ? 'evidenceFile'
  AND NOT ("data" ? 'diagramFile');

UPDATE "EvidenceSubmission"
SET "data" = "data" - 'evidenceFile'
WHERE "formType" = 'network-diagram'
  AND "data" ? 'evidenceFile'
  AND "data" -> 'evidenceFile' = "data" -> 'diagramFile';

-- rbac-matrix -> matrixFile
UPDATE "EvidenceSubmission"
SET "data" = jsonb_set("data", '{matrixFile}', "data" -> 'evidenceFile')
WHERE "formType" = 'rbac-matrix'
  AND "data" ? 'evidenceFile'
  AND NOT ("data" ? 'matrixFile');

UPDATE "EvidenceSubmission"
SET "data" = "data" - 'evidenceFile'
WHERE "formType" = 'rbac-matrix'
  AND "data" ? 'evidenceFile'
  AND "data" -> 'evidenceFile' = "data" -> 'matrixFile';
