-- Backfill framework-scoped control links from the best available source of truth.
--
-- Published framework versions are authoritative for already-versioned
-- framework definitions and organization instances. Frameworks/instances
-- without a published version fall back to the previous global link tables so
-- local or not-yet-versioned data does not appear empty after deploy.

-- Catalog/template links from each framework's latest published manifest.
WITH latest_versions AS (
  SELECT DISTINCT ON ("frameworkId")
    "frameworkId",
    manifest
  FROM "FrameworkVersion"
  ORDER BY "frameworkId", "publishedAt" DESC
)
INSERT INTO "FrameworkEditorControlPolicyTemplateLink" (
  "frameworkId",
  "controlTemplateId",
  "policyTemplateId"
)
SELECT
  latest_versions."frameworkId",
  control_template.id,
  policy_template.id
FROM latest_versions
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(latest_versions.manifest -> 'controls', '[]'::jsonb)) AS control_json(control_data)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(control_json.control_data -> 'policyIds', '[]'::jsonb)) AS policy_ids(policy_id)
JOIN "FrameworkEditorControlTemplate" control_template ON control_template.id = control_json.control_data ->> 'id'
JOIN "FrameworkEditorPolicyTemplate" policy_template ON policy_template.id = policy_ids.policy_id
ON CONFLICT ("frameworkId", "controlTemplateId", "policyTemplateId") DO NOTHING;

WITH latest_versions AS (
  SELECT DISTINCT ON ("frameworkId")
    "frameworkId",
    manifest
  FROM "FrameworkVersion"
  ORDER BY "frameworkId", "publishedAt" DESC
)
INSERT INTO "FrameworkEditorControlTaskTemplateLink" (
  "frameworkId",
  "controlTemplateId",
  "taskTemplateId"
)
SELECT
  latest_versions."frameworkId",
  control_template.id,
  task_template.id
FROM latest_versions
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(latest_versions.manifest -> 'controls', '[]'::jsonb)) AS control_json(control_data)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(control_json.control_data -> 'taskIds', '[]'::jsonb)) AS task_ids(task_id)
JOIN "FrameworkEditorControlTemplate" control_template ON control_template.id = control_json.control_data ->> 'id'
JOIN "FrameworkEditorTaskTemplate" task_template ON task_template.id = task_ids.task_id
ON CONFLICT ("frameworkId", "controlTemplateId", "taskTemplateId") DO NOTHING;

WITH latest_versions AS (
  SELECT DISTINCT ON ("frameworkId")
    "frameworkId",
    manifest
  FROM "FrameworkVersion"
  ORDER BY "frameworkId", "publishedAt" DESC
)
INSERT INTO "FrameworkEditorControlDocumentTypeLink" (
  "frameworkId",
  "controlTemplateId",
  "formType"
)
SELECT
  latest_versions."frameworkId",
  control_template.id,
  document_type_labels.enumlabel::"EvidenceFormType"
FROM latest_versions
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(latest_versions.manifest -> 'controls', '[]'::jsonb)) AS control_json(control_data)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(control_json.control_data -> 'documentTypes', '[]'::jsonb)) AS document_types(form_type)
JOIN pg_enum document_type_labels
  ON document_type_labels.enumtypid = '"EvidenceFormType"'::regtype
 AND document_type_labels.enumlabel = REPLACE(document_types.form_type, '_', '-')
JOIN "FrameworkEditorControlTemplate" control_template ON control_template.id = control_json.control_data ->> 'id'
ON CONFLICT ("frameworkId", "controlTemplateId", "formType") DO NOTHING;

-- Catalog/template fallback for frameworks without any published versions.
WITH unpublished_frameworks AS (
  SELECT framework.id
  FROM "FrameworkEditorFramework" framework
  WHERE NOT EXISTS (
    SELECT 1 FROM "FrameworkVersion" version WHERE version."frameworkId" = framework.id
  )
)
INSERT INTO "FrameworkEditorControlPolicyTemplateLink" (
  "frameworkId",
  "controlTemplateId",
  "policyTemplateId"
)
SELECT DISTINCT
  requirement."frameworkId",
  control_policy."A",
  control_policy."B"
FROM unpublished_frameworks
JOIN "FrameworkEditorRequirement" requirement ON requirement."frameworkId" = unpublished_frameworks.id
JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" control_requirement
  ON control_requirement."B" = requirement.id
JOIN "_FrameworkEditorControlTemplateToFrameworkEditorPolicyTemplate" control_policy
  ON control_policy."A" = control_requirement."A"
ON CONFLICT ("frameworkId", "controlTemplateId", "policyTemplateId") DO NOTHING;

WITH unpublished_frameworks AS (
  SELECT framework.id
  FROM "FrameworkEditorFramework" framework
  WHERE NOT EXISTS (
    SELECT 1 FROM "FrameworkVersion" version WHERE version."frameworkId" = framework.id
  )
)
INSERT INTO "FrameworkEditorControlTaskTemplateLink" (
  "frameworkId",
  "controlTemplateId",
  "taskTemplateId"
)
SELECT DISTINCT
  requirement."frameworkId",
  control_task."A",
  control_task."B"
FROM unpublished_frameworks
JOIN "FrameworkEditorRequirement" requirement ON requirement."frameworkId" = unpublished_frameworks.id
JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" control_requirement
  ON control_requirement."B" = requirement.id
JOIN "_FrameworkEditorControlTemplateToFrameworkEditorTaskTemplate" control_task
  ON control_task."A" = control_requirement."A"
ON CONFLICT ("frameworkId", "controlTemplateId", "taskTemplateId") DO NOTHING;

WITH unpublished_frameworks AS (
  SELECT framework.id
  FROM "FrameworkEditorFramework" framework
  WHERE NOT EXISTS (
    SELECT 1 FROM "FrameworkVersion" version WHERE version."frameworkId" = framework.id
  )
)
INSERT INTO "FrameworkEditorControlDocumentTypeLink" (
  "frameworkId",
  "controlTemplateId",
  "formType"
)
SELECT DISTINCT
  requirement."frameworkId",
  control_template.id,
  document_type.form_type
FROM unpublished_frameworks
JOIN "FrameworkEditorRequirement" requirement ON requirement."frameworkId" = unpublished_frameworks.id
JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" control_requirement
  ON control_requirement."B" = requirement.id
JOIN "FrameworkEditorControlTemplate" control_template
  ON control_template.id = control_requirement."A"
CROSS JOIN LATERAL unnest(control_template."documentTypes") AS document_type(form_type)
ON CONFLICT ("frameworkId", "controlTemplateId", "formType") DO NOTHING;

-- Organization framework-instance links from each instance's pinned version.
WITH versioned_instances AS (
  SELECT
    instance.id AS "frameworkInstanceId",
    instance."organizationId",
    version.manifest
  FROM "FrameworkInstance" instance
  JOIN "FrameworkVersion" version ON version.id = instance."currentVersionId"
)
INSERT INTO "FrameworkControlPolicyLink" (
  "frameworkInstanceId",
  "controlId",
  "policyId"
)
SELECT
  versioned_instances."frameworkInstanceId",
  control.id,
  policy.id
FROM versioned_instances
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(versioned_instances.manifest -> 'controls', '[]'::jsonb)) AS control_json(control_data)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(control_json.control_data -> 'policyIds', '[]'::jsonb)) AS policy_ids(policy_template_id)
JOIN "Control" control
  ON control."organizationId" = versioned_instances."organizationId"
 AND control."controlTemplateId" = control_json.control_data ->> 'id'
JOIN "Policy" policy
  ON policy."organizationId" = versioned_instances."organizationId"
 AND policy."policyTemplateId" = policy_ids.policy_template_id
ON CONFLICT ("frameworkInstanceId", "controlId", "policyId") DO NOTHING;

WITH versioned_instances AS (
  SELECT
    instance.id AS "frameworkInstanceId",
    instance."organizationId",
    version.manifest
  FROM "FrameworkInstance" instance
  JOIN "FrameworkVersion" version ON version.id = instance."currentVersionId"
)
INSERT INTO "FrameworkControlTaskLink" (
  "frameworkInstanceId",
  "controlId",
  "taskId"
)
SELECT
  versioned_instances."frameworkInstanceId",
  control.id,
  task.id
FROM versioned_instances
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(versioned_instances.manifest -> 'controls', '[]'::jsonb)) AS control_json(control_data)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(control_json.control_data -> 'taskIds', '[]'::jsonb)) AS task_ids(task_template_id)
JOIN "Control" control
  ON control."organizationId" = versioned_instances."organizationId"
 AND control."controlTemplateId" = control_json.control_data ->> 'id'
JOIN "Task" task
  ON task."organizationId" = versioned_instances."organizationId"
 AND task."taskTemplateId" = task_ids.task_template_id
ON CONFLICT ("frameworkInstanceId", "controlId", "taskId") DO NOTHING;

WITH versioned_instances AS (
  SELECT
    instance.id AS "frameworkInstanceId",
    instance."organizationId",
    version.manifest
  FROM "FrameworkInstance" instance
  JOIN "FrameworkVersion" version ON version.id = instance."currentVersionId"
)
INSERT INTO "FrameworkControlDocumentTypeLink" (
  "frameworkInstanceId",
  "controlId",
  "formType"
)
SELECT
  versioned_instances."frameworkInstanceId",
  control.id,
  document_type_labels.enumlabel::"EvidenceFormType"
FROM versioned_instances
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(versioned_instances.manifest -> 'controls', '[]'::jsonb)) AS control_json(control_data)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(control_json.control_data -> 'documentTypes', '[]'::jsonb)) AS document_types(form_type)
JOIN pg_enum document_type_labels
  ON document_type_labels.enumtypid = '"EvidenceFormType"'::regtype
 AND document_type_labels.enumlabel = REPLACE(document_types.form_type, '_', '-')
JOIN "Control" control
  ON control."organizationId" = versioned_instances."organizationId"
 AND control."controlTemplateId" = control_json.control_data ->> 'id'
ON CONFLICT ("frameworkInstanceId", "controlId", "formType") DO NOTHING;

-- Organization-instance fallback for instances without pinned versions.
INSERT INTO "FrameworkControlPolicyLink" (
  "frameworkInstanceId",
  "controlId",
  "policyId"
)
SELECT DISTINCT
  requirement_map."frameworkInstanceId",
  control_policy."A",
  control_policy."B"
FROM "RequirementMap" requirement_map
JOIN "FrameworkInstance" instance ON instance.id = requirement_map."frameworkInstanceId"
JOIN "_ControlToPolicy" control_policy ON control_policy."A" = requirement_map."controlId"
WHERE instance."currentVersionId" IS NULL
ON CONFLICT ("frameworkInstanceId", "controlId", "policyId") DO NOTHING;

INSERT INTO "FrameworkControlTaskLink" (
  "frameworkInstanceId",
  "controlId",
  "taskId"
)
SELECT DISTINCT
  requirement_map."frameworkInstanceId",
  control_task."A",
  control_task."B"
FROM "RequirementMap" requirement_map
JOIN "FrameworkInstance" instance ON instance.id = requirement_map."frameworkInstanceId"
JOIN "_ControlToTask" control_task ON control_task."A" = requirement_map."controlId"
WHERE instance."currentVersionId" IS NULL
ON CONFLICT ("frameworkInstanceId", "controlId", "taskId") DO NOTHING;

INSERT INTO "FrameworkControlDocumentTypeLink" (
  "frameworkInstanceId",
  "controlId",
  "formType"
)
SELECT DISTINCT
  requirement_map."frameworkInstanceId",
  control_document_type."controlId",
  control_document_type."formType"
FROM "RequirementMap" requirement_map
JOIN "FrameworkInstance" instance ON instance.id = requirement_map."frameworkInstanceId"
JOIN "ControlDocumentType" control_document_type
  ON control_document_type."controlId" = requirement_map."controlId"
WHERE instance."currentVersionId" IS NULL
ON CONFLICT ("frameworkInstanceId", "controlId", "formType") DO NOTHING;
