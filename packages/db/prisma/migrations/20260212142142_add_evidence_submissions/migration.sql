-- CreateTable
CREATE TABLE "EvidenceSubmission" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('evs'::text),
    "organizationId" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceSubmission_organizationId_formType_submittedAt_idx" ON "EvidenceSubmission"("organizationId", "formType", "submittedAt");

-- CreateIndex
CREATE INDEX "EvidenceSubmission_organizationId_formType_idx" ON "EvidenceSubmission"("organizationId", "formType");

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceSubmission" ADD CONSTRAINT "EvidenceSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
