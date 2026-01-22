-- CreateEnum
CREATE TYPE "TrustFramework" AS ENUM ('iso_27001', 'iso_42001', 'gdpr', 'hipaa', 'soc2_type1', 'soc2_type2', 'pci_dss', 'nen_7510', 'iso_9001');

-- CreateTable
CREATE TABLE "TrustResource" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tcr'::text),
    "organizationId" TEXT NOT NULL,
    "framework" "TrustFramework" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustResource_organizationId_framework_key" ON "TrustResource"("organizationId", "framework");

-- CreateIndex
CREATE INDEX "TrustResource_organizationId_idx" ON "TrustResource"("organizationId");

-- AddForeignKey
ALTER TABLE "TrustResource" ADD CONSTRAINT "TrustResource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

