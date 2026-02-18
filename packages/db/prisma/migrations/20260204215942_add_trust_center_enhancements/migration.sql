-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "overviewContent" TEXT,
ADD COLUMN     "overviewTitle" TEXT,
ADD COLUMN     "showOverview" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "complianceBadges" JSONB,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "showOnTrustPortal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustPortalOrder" INTEGER;

-- CreateTable
CREATE TABLE "TrustCustomLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tcl'::text),
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustCustomLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrustCustomLink_organizationId_idx" ON "TrustCustomLink"("organizationId");

-- CreateIndex
CREATE INDEX "TrustCustomLink_organizationId_isActive_order_idx" ON "TrustCustomLink"("organizationId", "isActive", "order");

-- AddForeignKey
ALTER TABLE "TrustCustomLink" ADD CONSTRAINT "TrustCustomLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
