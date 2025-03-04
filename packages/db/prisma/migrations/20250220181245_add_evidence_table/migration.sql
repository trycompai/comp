-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileUrls" TEXT[],
    "links" TEXT[],

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationEvidence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[],
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "OrganizationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_id_key" ON "Evidence"("id");

-- CreateIndex
CREATE INDEX "OrganizationEvidence_organizationId_idx" ON "OrganizationEvidence"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationEvidence_id_key" ON "OrganizationEvidence"("id");

-- AddForeignKey
ALTER TABLE "OrganizationEvidence" ADD CONSTRAINT "OrganizationEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
