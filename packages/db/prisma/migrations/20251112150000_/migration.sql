-- CreateEnum
CREATE TYPE "TrustAccessRequestStatus" AS ENUM ('under_review', 'approved', 'denied', 'canceled');

-- CreateEnum
CREATE TYPE "TrustAccessGrantStatus" AS ENUM ('active', 'expired', 'revoked');

-- AlterEnum
ALTER TYPE "AuditLogEntityType" ADD VALUE 'trust';

-- CreateTable
CREATE TABLE "TrustAccessRequest" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tar'::text),
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "jobTitle" TEXT,
    "purpose" TEXT,
    "requestedDurationDays" INTEGER,
    "requestedScopes" TEXT[],
    "status" "TrustAccessRequestStatus" NOT NULL DEFAULT 'under_review',
    "reviewerMemberId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustAccessGrant" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tag'::text),
    "accessRequestId" TEXT NOT NULL,
    "subjectEmail" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" "TrustAccessGrantStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedByMemberId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedByMemberId" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrustAccessRequest_organizationId_idx" ON "TrustAccessRequest"("organizationId");

-- CreateIndex
CREATE INDEX "TrustAccessRequest_email_idx" ON "TrustAccessRequest"("email");

-- CreateIndex
CREATE INDEX "TrustAccessRequest_status_idx" ON "TrustAccessRequest"("status");

-- CreateIndex
CREATE INDEX "TrustAccessRequest_organizationId_status_idx" ON "TrustAccessRequest"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrustAccessGrant_accessRequestId_key" ON "TrustAccessGrant"("accessRequestId");

-- CreateIndex
CREATE INDEX "TrustAccessGrant_accessRequestId_idx" ON "TrustAccessGrant"("accessRequestId");

-- CreateIndex
CREATE INDEX "TrustAccessGrant_subjectEmail_idx" ON "TrustAccessGrant"("subjectEmail");

-- CreateIndex
CREATE INDEX "TrustAccessGrant_status_idx" ON "TrustAccessGrant"("status");

-- CreateIndex
CREATE INDEX "TrustAccessGrant_expiresAt_idx" ON "TrustAccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "TrustAccessGrant_status_expiresAt_idx" ON "TrustAccessGrant"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "TrustAccessRequest" ADD CONSTRAINT "TrustAccessRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAccessRequest" ADD CONSTRAINT "TrustAccessRequest_reviewerMemberId_fkey" FOREIGN KEY ("reviewerMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAccessGrant" ADD CONSTRAINT "TrustAccessGrant_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "TrustAccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAccessGrant" ADD CONSTRAINT "TrustAccessGrant_issuedByMemberId_fkey" FOREIGN KEY ("issuedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAccessGrant" ADD CONSTRAINT "TrustAccessGrant_revokedByMemberId_fkey" FOREIGN KEY ("revokedByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
