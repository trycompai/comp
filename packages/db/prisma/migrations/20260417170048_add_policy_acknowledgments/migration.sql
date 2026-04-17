-- CreateTable
CREATE TABLE "PolicyAcknowledgment" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('polack'::text),
    "policyVersionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_memberId_idx" ON "PolicyAcknowledgment"("memberId");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_organizationId_idx" ON "PolicyAcknowledgment"("organizationId");

-- CreateIndex
CREATE INDEX "PolicyAcknowledgment_policyVersionId_idx" ON "PolicyAcknowledgment"("policyVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcknowledgment_policyVersionId_memberId_key" ON "PolicyAcknowledgment"("policyVersionId", "memberId");

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "PolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create an acknowledgment row for every existing signer on every
-- policy's current version, with signedAt set to NOW(). The feature did not
-- exist before this migration, so no prior timestamp is available. See:
-- docs/superpowers/specs/2026-04-17-policy-acknowledgment-history-design.md
INSERT INTO "PolicyAcknowledgment" ("id", "policyVersionId", "memberId", "organizationId", "signedAt", "createdAt")
SELECT
  generate_prefixed_cuid('polack'),
  p."currentVersionId",
  unnest(p."signedBy") AS "memberId",
  p."organizationId",
  NOW(),
  NOW()
FROM "Policy" p
WHERE p."currentVersionId" IS NOT NULL
  AND cardinality(p."signedBy") > 0
ON CONFLICT ("policyVersionId", "memberId") DO NOTHING;
