-- Enforce tenant consistency on CustomFramework references at the DB level:
-- a CustomRequirement or FrameworkInstance that points at a CustomFramework
-- must be in the same organization as that framework. Previously this was
-- only enforced in application code; this migration upgrades the FKs to
-- composite (id, organizationId) so Postgres rejects cross-tenant links.

-- Defense-in-depth sanity check: fail the migration loudly if any existing
-- rows violate the invariant, rather than silently letting the composite FK
-- rewrite proceed against bad data.
DO $$
DECLARE
  bad_req bigint;
  bad_fi  bigint;
BEGIN
  SELECT count(*) INTO bad_req
  FROM "CustomRequirement" cr
  JOIN "CustomFramework" cf ON cf."id" = cr."customFrameworkId"
  WHERE cr."organizationId" <> cf."organizationId";

  SELECT count(*) INTO bad_fi
  FROM "FrameworkInstance" fi
  JOIN "CustomFramework" cf ON cf."id" = fi."customFrameworkId"
  WHERE fi."organizationId" <> cf."organizationId";

  IF bad_req > 0 OR bad_fi > 0 THEN
    RAISE EXCEPTION
      'tenant_consistent_custom_fks: % cross-tenant CustomRequirement rows and % cross-tenant FrameworkInstance rows must be fixed before this migration can run',
      bad_req, bad_fi;
  END IF;
END $$;

-- Unique constraint required for the composite FK target.
ALTER TABLE "CustomFramework"
    ADD CONSTRAINT "CustomFramework_id_organizationId_key"
    UNIQUE ("id", "organizationId");

-- CustomRequirement: replace the single-column FK with a composite FK.
ALTER TABLE "CustomRequirement" DROP CONSTRAINT "CustomRequirement_customFrameworkId_fkey";
ALTER TABLE "CustomRequirement"
    ADD CONSTRAINT "CustomRequirement_customFrameworkId_organizationId_fkey"
    FOREIGN KEY ("customFrameworkId", "organizationId")
    REFERENCES "CustomFramework"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- FrameworkInstance: same treatment for its optional customFrameworkId.
ALTER TABLE "FrameworkInstance" DROP CONSTRAINT "FrameworkInstance_customFrameworkId_fkey";
ALTER TABLE "FrameworkInstance"
    ADD CONSTRAINT "FrameworkInstance_customFrameworkId_organizationId_fkey"
    FOREIGN KEY ("customFrameworkId", "organizationId")
    REFERENCES "CustomFramework"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;
