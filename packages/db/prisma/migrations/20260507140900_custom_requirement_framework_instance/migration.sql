-- Allow a CustomRequirement to be attached directly to a FrameworkInstance,
-- not just a CustomFramework. Use case: an org wants to tack an extra
-- requirement onto a platform framework like ISO 27001 without authoring a
-- whole new CustomFramework. Exactly one of customFrameworkId /
-- frameworkInstanceId is set, enforced by a CHECK constraint.

-- 1. Composite-FK target on FrameworkInstance so the new FK can enforce that
--    a per-instance custom requirement only points at an FI in its own org.
ALTER TABLE "FrameworkInstance"
    ADD CONSTRAINT "FrameworkInstance_id_organizationId_key" UNIQUE ("id", "organizationId");

-- 2. Schema changes on CustomRequirement: relax the existing FK and add the new one.
ALTER TABLE "CustomRequirement" ADD COLUMN "frameworkInstanceId" TEXT;
ALTER TABLE "CustomRequirement" ALTER COLUMN "customFrameworkId" DROP NOT NULL;

ALTER TABLE "CustomRequirement"
    ADD CONSTRAINT "CustomRequirement_frameworkInstanceId_organizationId_fkey"
    FOREIGN KEY ("frameworkInstanceId", "organizationId")
    REFERENCES "FrameworkInstance"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CustomRequirement_frameworkInstanceId_idx"
    ON "CustomRequirement"("frameworkInstanceId");

-- Identifier uniqueness scoped to whichever parent is set. Postgres treats
-- NULLs as distinct in unique indexes by default, so the inactive parent
-- column on each row never collides across rows.
CREATE UNIQUE INDEX "CustomRequirement_frameworkInstanceId_identifier_key"
    ON "CustomRequirement"("frameworkInstanceId", "identifier");

-- 3. Exactly one of the two parents must be set.
ALTER TABLE "CustomRequirement"
    ADD CONSTRAINT "CustomRequirement_one_parent_check"
    CHECK (("customFrameworkId" IS NOT NULL)::int + ("frameworkInstanceId" IS NOT NULL)::int = 1);
