-- CreateEnum
CREATE TYPE "TrustNDAStatus" AS ENUM ('pending', 'signed', 'void');

-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'trust_nda';

-- CreateTable
CREATE TABLE "TrustNDAAgreement" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tna'::text),
    "organizationId" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "grantId" TEXT,
    "signerName" TEXT,
    "signerEmail" TEXT,
    "status" "TrustNDAStatus" NOT NULL DEFAULT 'pending',
    "signToken" TEXT NOT NULL,
    "signTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "pdfTemplateKey" TEXT,
    "pdfSignedKey" TEXT,
    "signedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustNDAAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrustNDAAgreement_grantId_key" ON "TrustNDAAgreement"("grantId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustNDAAgreement_signToken_key" ON "TrustNDAAgreement"("signToken");

-- CreateIndex
CREATE INDEX "TrustNDAAgreement_organizationId_idx" ON "TrustNDAAgreement"("organizationId");

-- CreateIndex
CREATE INDEX "TrustNDAAgreement_accessRequestId_idx" ON "TrustNDAAgreement"("accessRequestId");

-- CreateIndex
CREATE INDEX "TrustNDAAgreement_signToken_idx" ON "TrustNDAAgreement"("signToken");

-- CreateIndex
CREATE INDEX "TrustNDAAgreement_status_idx" ON "TrustNDAAgreement"("status");

-- AddForeignKey
ALTER TABLE "TrustNDAAgreement" ADD CONSTRAINT "TrustNDAAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustNDAAgreement" ADD CONSTRAINT "TrustNDAAgreement_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "TrustAccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustNDAAgreement" ADD CONSTRAINT "TrustNDAAgreement_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "TrustAccessGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
