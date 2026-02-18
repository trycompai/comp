-- CreateTable
CREATE TABLE "OrganizationChart" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('och'::text),
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Organization Chart',
    "type" TEXT NOT NULL DEFAULT 'interactive',
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "uploadedImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationChart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationChart_organizationId_key" ON "OrganizationChart"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationChart_organizationId_idx" ON "OrganizationChart"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationChart" ADD CONSTRAINT "OrganizationChart_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
