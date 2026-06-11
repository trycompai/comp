-- Custom frameworks on the Trust Portal.
--
-- A TrustResource (compliance certificate PDF) can now belong to EITHER a native
-- framework (TrustFramework enum) OR an org-authored CustomFramework. New table
-- TrustCustomFramework records which custom frameworks an org displays on its
-- public portal, mirroring the per-framework enabled/status columns that native
-- frameworks store on `Trust`.

-- AlterTable: TrustResource — framework becomes optional; add custom framework link.
ALTER TABLE "TrustResource" ALTER COLUMN "framework" DROP NOT NULL;
ALTER TABLE "TrustResource" ADD COLUMN "customFrameworkId" TEXT;

-- CreateTable
CREATE TABLE "TrustCustomFramework" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tcf'::text),
    "organizationId" TEXT NOT NULL,
    "customFrameworkId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "FrameworkStatus" NOT NULL DEFAULT 'started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustCustomFramework_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustResource_organizationId_customFrameworkId_key" ON "TrustResource"("organizationId", "customFrameworkId");

-- CreateIndex
CREATE INDEX "TrustResource_customFrameworkId_idx" ON "TrustResource"("customFrameworkId");

-- CreateIndex
CREATE INDEX "TrustCustomFramework_organizationId_idx" ON "TrustCustomFramework"("organizationId");

-- CreateIndex
CREATE INDEX "TrustCustomFramework_customFrameworkId_idx" ON "TrustCustomFramework"("customFrameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustCustomFramework_organizationId_customFrameworkId_key" ON "TrustCustomFramework"("organizationId", "customFrameworkId");

-- AddForeignKey
ALTER TABLE "TrustResource" ADD CONSTRAINT "TrustResource_customFrameworkId_organizationId_fkey" FOREIGN KEY ("customFrameworkId", "organizationId") REFERENCES "CustomFramework"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustCustomFramework" ADD CONSTRAINT "TrustCustomFramework_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustCustomFramework" ADD CONSTRAINT "TrustCustomFramework_customFrameworkId_organizationId_fkey" FOREIGN KEY ("customFrameworkId", "organizationId") REFERENCES "CustomFramework"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraint: a TrustResource belongs to exactly one of a native framework
-- or a custom framework. Existing rows (framework set, customFrameworkId NULL)
-- satisfy this, so the constraint is safe to add in place.
ALTER TABLE "TrustResource"
    ADD CONSTRAINT "TrustResource_one_framework_check"
    CHECK (("framework" IS NOT NULL)::int + ("customFrameworkId" IS NOT NULL)::int = 1);
