-- CreateEnum
CREATE TYPE "TrustComplianceFramework" AS ENUM ('iso_270', 'iso_420', 'gdpr', 'hipaa', 'soc2_type1', 'soc2_type2', 'pci_dss', 'nen_7510', 'iso_9001');

-- CreateTable
CREATE TABLE "TrustComplianceResource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "framework" "TrustComplianceFramework" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustComplianceResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustComplianceResource_organizationId_framework_key" ON "TrustComplianceResource"("organizationId", "framework");

-- CreateIndex
CREATE INDEX "TrustComplianceResource_organizationId_idx" ON "TrustComplianceResource"("organizationId");

-- AddForeignKey
ALTER TABLE "TrustComplianceResource" ADD CONSTRAINT "TrustComplianceResource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustComplianceResource" ADD CONSTRAINT "TrustComplianceResource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

