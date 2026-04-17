-- CreateTable
CREATE TABLE "PolicyAcknowledgment" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('polack'::text),
    "policyVersionId" TEXT NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT,
    "memberEmail" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "PolicyAcknowledgment_policyVersionId_memberId_key" ON "PolicyAcknowledgment"("policyVersionId", "memberId");

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "PolicyVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create an acknowledgment row for every existing signer on every
-- policy's current version, with signedAt = NOW() (no prior timestamp exists
-- pre-feature). Denormalize member name+email onto the row so the audit
-- record survives if the Member row is ever deleted. Joining Member also
-- filters stale signedBy entries (member IDs that no longer exist) so the FK
-- never rejects. See docs/superpowers/specs/2026-04-17-policy-acknowledgment-history-design.md
INSERT INTO "PolicyAcknowledgment" (
  "id", "policyVersionId", "memberId", "memberName", "memberEmail",
  "organizationId", "signedAt", "createdAt"
)
SELECT
  generate_prefixed_cuid('polack'),
  p."currentVersionId",
  m."id",
  u."name",
  u."email",
  p."organizationId",
  NOW(),
  NOW()
FROM "Policy" p
JOIN "Member" m ON m."id" = ANY(p."signedBy") AND m."organizationId" = p."organizationId"
JOIN "User" u ON u."id" = m."userId"
WHERE p."currentVersionId" IS NOT NULL
  AND cardinality(p."signedBy") > 0
ON CONFLICT ("policyVersionId", "memberId") DO NOTHING;
