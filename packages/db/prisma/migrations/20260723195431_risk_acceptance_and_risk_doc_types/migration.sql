-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IsmsDocumentType" ADD VALUE 'risk_assessment_methodology';
ALTER TYPE "IsmsDocumentType" ADD VALUE 'risk_treatment_plan';

-- CreateTable
CREATE TABLE "RiskAcceptance" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('rska'::text),
    "organizationId" TEXT NOT NULL,
    "riskId" TEXT,
    "vendorId" TEXT,
    "acceptedById" TEXT,
    "acceptedByName" TEXT NOT NULL,
    "notes" TEXT,
    "residualLikelihood" "Likelihood" NOT NULL,
    "residualImpact" "Impact" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskAcceptance_organizationId_idx" ON "RiskAcceptance"("organizationId");

-- CreateIndex
CREATE INDEX "RiskAcceptance_riskId_idx" ON "RiskAcceptance"("riskId");

-- CreateIndex
CREATE INDEX "RiskAcceptance_vendorId_idx" ON "RiskAcceptance"("vendorId");

-- AddForeignKey
ALTER TABLE "RiskAcceptance" ADD CONSTRAINT "RiskAcceptance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAcceptance" ADD CONSTRAINT "RiskAcceptance_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAcceptance" ADD CONSTRAINT "RiskAcceptance_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAcceptance" ADD CONSTRAINT "RiskAcceptance_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exactly one subject per acceptance: a row belongs to a risk XOR a vendor.
-- Prisma cannot express this; keep in sync with risk-acceptance.prisma.
ALTER TABLE "RiskAcceptance" ADD CONSTRAINT "risk_acceptance_single_subject" CHECK (num_nonnulls("riskId", "vendorId") = 1);
