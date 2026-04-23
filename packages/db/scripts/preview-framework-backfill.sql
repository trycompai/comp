-- Dry-run preview for migration 20260423121434_backfill_framework_versions.
-- Read-only: no INSERT/UPDATE/DELETE. Safe to run against staging or prod
-- BEFORE the framework-versioning schema migration has been deployed — this
-- script only reads from framework-editor + framework-instance tables that
-- already exist, so it works pre-merge as well as post-merge.
--
-- Run via:
--   psql $DATABASE_URL -f preview-framework-backfill.sql
-- or paste individual sections in a psql session.

\echo '== Section 1: How many FrameworkVersions the migration will create =='
-- Every FrameworkEditorFramework row gets a v1.0.0 version. On an un-migrated
-- DB nothing is versioned yet, so this equals total.
SELECT COUNT(*) AS frameworks_to_version FROM "FrameworkEditorFramework";

\echo ''
\echo '== Section 2: How many FrameworkInstances the migration will pin =='
-- Every non-custom-framework instance gets pinned to its framework''s v1.0.0.
-- Custom-framework instances (frameworkId IS NULL) are skipped.
SELECT
  COUNT(*) FILTER (WHERE "frameworkId" IS NOT NULL) AS instances_to_pin,
  COUNT(*) FILTER (WHERE "frameworkId" IS NULL) AS instances_custom_framework_skipped,
  COUNT(*) AS instances_total
FROM "FrameworkInstance";

\echo ''
\echo '== Section 3: Per-framework manifest preview =='
-- Eyeball these counts against what you''d expect per framework. SOC 2 / ISO
-- should have many; a test framework may have few. Zero controls on a real
-- framework is a red flag.
SELECT
  fef.name AS framework_name,
  fef.version AS catalog_version,
  (SELECT COUNT(*) FROM "FrameworkEditorRequirement" r WHERE r."frameworkId" = fef.id) AS requirements,
  (
    SELECT COUNT(DISTINCT ct.id)
    FROM "FrameworkEditorControlTemplate" ct
    WHERE EXISTS (
      SELECT 1
      FROM "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr
      JOIN "FrameworkEditorRequirement" r ON r.id = jr."B"
      WHERE jr."A" = ct.id AND r."frameworkId" = fef.id
    )
  ) AS controls,
  (
    SELECT COUNT(DISTINCT pt.id)
    FROM "FrameworkEditorPolicyTemplate" pt
    JOIN "_FrameworkEditorControlTemplateToFrameworkEditorPolicyTemplate" jp ON jp."B" = pt.id
    JOIN "FrameworkEditorControlTemplate" ct ON ct.id = jp."A"
    JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr ON jr."A" = ct.id
    JOIN "FrameworkEditorRequirement" r ON r.id = jr."B"
    WHERE r."frameworkId" = fef.id
  ) AS policies,
  (
    SELECT COUNT(DISTINCT tt.id)
    FROM "FrameworkEditorTaskTemplate" tt
    JOIN "_FrameworkEditorControlTemplateToFrameworkEditorTaskTemplate" jt ON jt."B" = tt.id
    JOIN "FrameworkEditorControlTemplate" ct ON ct.id = jt."A"
    JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr ON jr."A" = ct.id
    JOIN "FrameworkEditorRequirement" r ON r.id = jr."B"
    WHERE r."frameworkId" = fef.id
  ) AS tasks,
  (
    SELECT COUNT(*) FROM "FrameworkInstance" fi WHERE fi."frameworkId" = fef.id
  ) AS instances_for_this_framework
FROM "FrameworkEditorFramework" fef
ORDER BY fef.name;

\echo ''
\echo '== Section 4: Sanity checks (flag unusual data shapes) =='

\echo '-- Frameworks with zero requirements (manifest would have empty controls/policies/tasks):'
SELECT fef.id, fef.name
FROM "FrameworkEditorFramework" fef
WHERE NOT EXISTS (
  SELECT 1 FROM "FrameworkEditorRequirement" r WHERE r."frameworkId" = fef.id
);

\echo ''
\echo '-- Policy templates with NULL content (would store null in manifest):'
SELECT COUNT(*) AS policy_templates_with_null_content
FROM "FrameworkEditorPolicyTemplate"
WHERE content IS NULL;

\echo ''
\echo '-- FrameworkInstances with custom frameworks (migration correctly skips these):'
SELECT COUNT(*) AS custom_framework_instances
FROM "FrameworkInstance"
WHERE "frameworkId" IS NULL AND "customFrameworkId" IS NOT NULL;

\echo ''
\echo '-- Cross-framework control template references (manifest will filter these):'
-- Checks for control→requirement M:N edges where the requirement belongs to a
-- different framework than other requirements on the same control. Non-zero
-- is expected: control templates are intentionally shared across frameworks.
SELECT COUNT(*) AS cross_framework_control_edges
FROM "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr1
JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr2
  ON jr2."A" = jr1."A" AND jr2."B" <> jr1."B"
JOIN "FrameworkEditorRequirement" r1 ON r1.id = jr1."B"
JOIN "FrameworkEditorRequirement" r2 ON r2.id = jr2."B"
WHERE r1."frameworkId" <> r2."frameworkId";

\echo ''
\echo '== Preview complete =='
