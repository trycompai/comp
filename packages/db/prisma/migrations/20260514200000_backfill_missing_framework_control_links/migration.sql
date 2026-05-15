-- Backfill FrameworkControlPolicyLink for orgs that were onboarded after the
-- initial backfill migration ran but before the Next.js upsert code was updated.
-- Uses RequirementMap to scope _ControlToPolicy entries to specific framework instances.

INSERT INTO "FrameworkControlPolicyLink" (
  "frameworkInstanceId",
  "controlId",
  "policyId"
)
SELECT DISTINCT
  rm."frameworkInstanceId",
  cp."A",
  cp."B"
FROM "_ControlToPolicy" cp
JOIN "RequirementMap" rm ON rm."controlId" = cp."A"
WHERE rm."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "FrameworkControlPolicyLink" fpl
    WHERE fpl."frameworkInstanceId" = rm."frameworkInstanceId"
      AND fpl."controlId" = cp."A"
      AND fpl."policyId" = cp."B"
  )
ON CONFLICT ("frameworkInstanceId", "controlId", "policyId") DO NOTHING;

INSERT INTO "FrameworkControlTaskLink" (
  "frameworkInstanceId",
  "controlId",
  "taskId"
)
SELECT DISTINCT
  rm."frameworkInstanceId",
  ct."A",
  ct."B"
FROM "_ControlToTask" ct
JOIN "RequirementMap" rm ON rm."controlId" = ct."A"
WHERE rm."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "FrameworkControlTaskLink" ftl
    WHERE ftl."frameworkInstanceId" = rm."frameworkInstanceId"
      AND ftl."controlId" = ct."A"
      AND ftl."taskId" = ct."B"
  )
ON CONFLICT ("frameworkInstanceId", "controlId", "taskId") DO NOTHING;

INSERT INTO "FrameworkControlDocumentTypeLink" (
  "frameworkInstanceId",
  "controlId",
  "formType"
)
SELECT DISTINCT
  rm."frameworkInstanceId",
  cdt."controlId",
  cdt."formType"
FROM "ControlDocumentType" cdt
JOIN "RequirementMap" rm ON rm."controlId" = cdt."controlId"
WHERE rm."archivedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "FrameworkControlDocumentTypeLink" fdl
    WHERE fdl."frameworkInstanceId" = rm."frameworkInstanceId"
      AND fdl."controlId" = cdt."controlId"
      AND fdl."formType" = cdt."formType"
  )
ON CONFLICT ("frameworkInstanceId", "controlId", "formType") DO NOTHING;
