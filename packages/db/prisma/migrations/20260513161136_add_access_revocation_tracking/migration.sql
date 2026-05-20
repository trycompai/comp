-- AlterTable
ALTER TABLE "OffboardingChecklistTemplate" ADD COLUMN     "isAccessRevocation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OffboardingAccessRevocation" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('oar'::text),
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "revokedById" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "OffboardingAccessRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OffboardingAccessRevocation_organizationId_idx" ON "OffboardingAccessRevocation"("organizationId");

-- CreateIndex
CREATE INDEX "OffboardingAccessRevocation_memberId_idx" ON "OffboardingAccessRevocation"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "OffboardingAccessRevocation_memberId_vendorId_key" ON "OffboardingAccessRevocation"("memberId", "vendorId");

-- AddForeignKey
ALTER TABLE "OffboardingAccessRevocation" ADD CONSTRAINT "OffboardingAccessRevocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingAccessRevocation" ADD CONSTRAINT "OffboardingAccessRevocation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingAccessRevocation" ADD CONSTRAINT "OffboardingAccessRevocation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingAccessRevocation" ADD CONSTRAINT "OffboardingAccessRevocation_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
