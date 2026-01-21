-- CreateTable
CREATE TABLE "FleetPolicyResult" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fpr'::text),
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fleetPolicyId" INTEGER NOT NULL,
    "fleetPolicyName" TEXT NOT NULL,
    "fleetPolicyResponse" TEXT NOT NULL,
    "attachments" TEXT[] NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetPolicyResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FleetPolicyResult_memberId_idx" ON "FleetPolicyResult"("memberId");

-- CreateIndex
CREATE INDEX "FleetPolicyResult_organizationId_idx" ON "FleetPolicyResult"("organizationId");

-- AddForeignKey
ALTER TABLE "FleetPolicyResult" ADD CONSTRAINT "FleetPolicyResult_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetPolicyResult" ADD CONSTRAINT "FleetPolicyResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
