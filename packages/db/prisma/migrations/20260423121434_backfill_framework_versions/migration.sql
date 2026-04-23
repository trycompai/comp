-- Backfill FrameworkVersion v1.0.0 for every FrameworkEditorFramework that
-- doesn't already have a version, and pin every FrameworkInstance with
-- currentVersionId = NULL to its framework's v1.0.0. Authoritative, one-shot
-- data migration for the framework-versioning rollout.
--
-- Must stay semantically equivalent to
-- packages/db/src/scripts/backfill-framework-versions.ts (kept as a dev-only
-- convenience called from the seed script for post-reset local databases).
--
-- Manifest shape is defined in
-- apps/api/src/frameworks/framework-versioning/manifest.types.ts.

DO $$
DECLARE
  f RECORD;
  v_manifest jsonb;
BEGIN
  FOR f IN
    SELECT fef.id, fef.name, fef.version, fef.description
    FROM "FrameworkEditorFramework" fef
    WHERE NOT EXISTS (
      SELECT 1 FROM "FrameworkVersion" fv WHERE fv."frameworkId" = fef.id
    )
  LOOP
    v_manifest := jsonb_build_object(
      'framework', jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'catalogVersion', f.version,
        'description', f.description
      ),
      'requirements', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'identifier', r.identifier,
            'name', r.name,
            'description', r.description
          )
          ORDER BY r.id
        )
        FROM "FrameworkEditorRequirement" r
        WHERE r."frameworkId" = f.id
      ), '[]'::jsonb),
      'controls', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', ct.id,
            'name', ct.name,
            'description', ct.description,
            'requirementIds', COALESCE((
              SELECT jsonb_agg(r2.id ORDER BY r2.id)
              FROM "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr
              JOIN "FrameworkEditorRequirement" r2 ON r2.id = jr."B"
              WHERE jr."A" = ct.id AND r2."frameworkId" = f.id
            ), '[]'::jsonb),
            'policyIds', COALESCE((
              SELECT jsonb_agg(pt.id ORDER BY pt.id)
              FROM "_FrameworkEditorControlTemplateToFrameworkEditorPolicyTemplate" jp
              JOIN "FrameworkEditorPolicyTemplate" pt ON pt.id = jp."B"
              WHERE jp."A" = ct.id
            ), '[]'::jsonb),
            'taskIds', COALESCE((
              SELECT jsonb_agg(tt.id ORDER BY tt.id)
              FROM "_FrameworkEditorControlTemplateToFrameworkEditorTaskTemplate" jt
              JOIN "FrameworkEditorTaskTemplate" tt ON tt.id = jt."B"
              WHERE jt."A" = ct.id
            ), '[]'::jsonb),
            'documentTypes', COALESCE(to_jsonb(ct."documentTypes"::text[]), '[]'::jsonb)
          )
          ORDER BY ct.id
        )
        FROM "FrameworkEditorControlTemplate" ct
        WHERE EXISTS (
          SELECT 1
          FROM "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr
          JOIN "FrameworkEditorRequirement" r ON r.id = jr."B"
          WHERE jr."A" = ct.id AND r."frameworkId" = f.id
        )
      ), '[]'::jsonb),
      'policies', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dp.id,
            'name', dp.name,
            'description', dp.description,
            'content', dp.content,
            'frequency', dp.frequency::text,
            'department', dp.department::text
          )
          ORDER BY dp.id
        )
        FROM (
          SELECT DISTINCT
            pt.id, pt.name, pt.description, pt.content, pt.frequency, pt.department
          FROM "FrameworkEditorPolicyTemplate" pt
          JOIN "_FrameworkEditorControlTemplateToFrameworkEditorPolicyTemplate" jp
            ON jp."B" = pt.id
          JOIN "FrameworkEditorControlTemplate" ct ON ct.id = jp."A"
          JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr
            ON jr."A" = ct.id
          JOIN "FrameworkEditorRequirement" r ON r.id = jr."B"
          WHERE r."frameworkId" = f.id
        ) dp
      ), '[]'::jsonb),
      'tasks', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', dt.id,
            'name', dt.name,
            'description', dt.description,
            'frequency', dt.frequency::text,
            'department', dt.department::text
          )
          ORDER BY dt.id
        )
        FROM (
          SELECT DISTINCT
            tt.id, tt.name, tt.description, tt.frequency, tt.department
          FROM "FrameworkEditorTaskTemplate" tt
          JOIN "_FrameworkEditorControlTemplateToFrameworkEditorTaskTemplate" jt
            ON jt."B" = tt.id
          JOIN "FrameworkEditorControlTemplate" ct ON ct.id = jt."A"
          JOIN "_FrameworkEditorControlTemplateToFrameworkEditorRequirement" jr
            ON jr."A" = ct.id
          JOIN "FrameworkEditorRequirement" r ON r.id = jr."B"
          WHERE r."frameworkId" = f.id
        ) dt
      ), '[]'::jsonb)
    );

    INSERT INTO "FrameworkVersion" ("frameworkId", version, "releaseNotes", manifest)
    VALUES (f.id, '1.0.0', 'Initial version (backfilled).', v_manifest);
  END LOOP;

  UPDATE "FrameworkInstance" fi
  SET "currentVersionId" = fv.id
  FROM "FrameworkVersion" fv
  WHERE fi."frameworkId" IS NOT NULL
    AND fi."currentVersionId" IS NULL
    AND fv."frameworkId" = fi."frameworkId"
    AND fv.version = '1.0.0';
END $$;
