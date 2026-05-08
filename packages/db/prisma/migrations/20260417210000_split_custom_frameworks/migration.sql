-- Move per-org "custom" frameworks and requirements out of the FrameworkEditor*
-- platform tables into dedicated per-org tables, eliminating cross-tenant leak
-- risk and restoring the template/instance separation used elsewhere.

-- 1. Create new per-org tables.
CREATE TABLE "CustomFramework" (
    "id"             TEXT NOT NULL DEFAULT generate_prefixed_cuid('cfrm'::text),
    "name"           TEXT NOT NULL,
    "description"    TEXT NOT NULL,
    "version"        TEXT NOT NULL DEFAULT '1.0.0',
    "organizationId" TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFramework_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomFramework_organizationId_idx" ON "CustomFramework"("organizationId");

ALTER TABLE "CustomFramework" ADD CONSTRAINT "CustomFramework_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CustomRequirement" (
    "id"                TEXT NOT NULL DEFAULT generate_prefixed_cuid('creq'::text),
    "name"              TEXT NOT NULL,
    "description"       TEXT NOT NULL,
    "identifier"        TEXT NOT NULL,
    "organizationId"    TEXT NOT NULL,
    "customFrameworkId" TEXT NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomRequirement_customFrameworkId_identifier_key"
    ON "CustomRequirement"("customFrameworkId", "identifier");
CREATE INDEX "CustomRequirement_organizationId_idx" ON "CustomRequirement"("organizationId");

ALTER TABLE "CustomRequirement" ADD CONSTRAINT "CustomRequirement_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomRequirement" ADD CONSTRAINT "CustomRequirement_customFrameworkId_fkey"
    FOREIGN KEY ("customFrameworkId") REFERENCES "CustomFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Relax FK nullability on FrameworkInstance / RequirementMap so rows can point
--    at the new tables instead.
ALTER TABLE "FrameworkInstance" ADD COLUMN "customFrameworkId" TEXT;
ALTER TABLE "FrameworkInstance" ALTER COLUMN "frameworkId" DROP NOT NULL;
ALTER TABLE "FrameworkInstance" ADD CONSTRAINT "FrameworkInstance_customFrameworkId_fkey"
    FOREIGN KEY ("customFrameworkId") REFERENCES "CustomFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "FrameworkInstance_customFrameworkId_idx" ON "FrameworkInstance"("customFrameworkId");
CREATE UNIQUE INDEX "FrameworkInstance_organizationId_customFrameworkId_key"
    ON "FrameworkInstance"("organizationId", "customFrameworkId");

ALTER TABLE "RequirementMap" ADD COLUMN "customRequirementId" TEXT;
ALTER TABLE "RequirementMap" ALTER COLUMN "requirementId" DROP NOT NULL;
ALTER TABLE "RequirementMap" ADD CONSTRAINT "RequirementMap_customRequirementId_fkey"
    FOREIGN KEY ("customRequirementId") REFERENCES "CustomRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "RequirementMap_customRequirementId_frameworkInstanceId_idx"
    ON "RequirementMap"("customRequirementId", "frameworkInstanceId");
CREATE UNIQUE INDEX "RequirementMap_controlId_frameworkInstanceId_customRequirem_key"
    ON "RequirementMap"("controlId", "frameworkInstanceId", "customRequirementId");

-- 3. Data move: for any org-scoped rows on the editor tables (added by the
--    previous migration on this branch), copy them into the new per-org tables
--    and repoint FrameworkInstance / RequirementMap.
INSERT INTO "CustomFramework" ("id", "name", "description", "version", "organizationId", "createdAt", "updatedAt")
SELECT
    -- Reuse the original id so dependent FKs (FrameworkInstance.customFrameworkId below)
    -- can be rewritten by id equality.
    "id", "name", "description", "version", "organizationId", "createdAt", "updatedAt"
FROM "FrameworkEditorFramework"
WHERE "organizationId" IS NOT NULL;

INSERT INTO "CustomRequirement" ("id", "name", "description", "identifier", "organizationId", "customFrameworkId", "createdAt", "updatedAt")
SELECT
    "id", "name", "description", "identifier", "organizationId", "frameworkId", "createdAt", "updatedAt"
FROM "FrameworkEditorRequirement"
WHERE "organizationId" IS NOT NULL;

-- Repoint FrameworkInstance rows that point at now-migrated custom frameworks.
UPDATE "FrameworkInstance" fi
SET    "customFrameworkId" = fi."frameworkId",
       "frameworkId"       = NULL
FROM   "FrameworkEditorFramework" fef
WHERE  fi."frameworkId" = fef."id"
  AND  fef."organizationId" IS NOT NULL;

-- Repoint RequirementMap rows that point at now-migrated custom requirements.
UPDATE "RequirementMap" rm
SET    "customRequirementId" = rm."requirementId",
       "requirementId"       = NULL
FROM   "FrameworkEditorRequirement" fer
WHERE  rm."requirementId" = fer."id"
  AND  fer."organizationId" IS NOT NULL;

-- 4. Remove org-scoped rows from the editor tables and drop the organizationId
--    columns + indexes + FKs added in the previous migration.
DELETE FROM "FrameworkEditorRequirement" WHERE "organizationId" IS NOT NULL;
DELETE FROM "FrameworkEditorFramework"   WHERE "organizationId" IS NOT NULL;

ALTER TABLE "FrameworkEditorFramework"   DROP CONSTRAINT IF EXISTS "FrameworkEditorFramework_organizationId_fkey";
ALTER TABLE "FrameworkEditorRequirement" DROP CONSTRAINT IF EXISTS "FrameworkEditorRequirement_organizationId_fkey";
DROP INDEX IF EXISTS "FrameworkEditorFramework_organizationId_idx";
DROP INDEX IF EXISTS "FrameworkEditorRequirement_organizationId_idx";
DROP INDEX IF EXISTS "FrameworkEditorRequirement_frameworkId_idx";
ALTER TABLE "FrameworkEditorFramework"   DROP COLUMN IF EXISTS "organizationId";
ALTER TABLE "FrameworkEditorRequirement" DROP COLUMN IF EXISTS "organizationId";

-- 5. CHECK constraints: exactly one of the two FKs must be set.
ALTER TABLE "FrameworkInstance"
    ADD CONSTRAINT "FrameworkInstance_one_framework_check"
    CHECK (("frameworkId" IS NOT NULL)::int + ("customFrameworkId" IS NOT NULL)::int = 1);

ALTER TABLE "RequirementMap"
    ADD CONSTRAINT "RequirementMap_one_requirement_check"
    CHECK (("requirementId" IS NOT NULL)::int + ("customRequirementId" IS NOT NULL)::int = 1);
