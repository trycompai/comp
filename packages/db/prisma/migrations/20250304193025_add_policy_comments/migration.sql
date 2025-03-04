-- CreateTable
CREATE TABLE "PolicyComments" (
    "id" TEXT NOT NULL,
    "organizationPolicyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyComments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyComments_organizationPolicyId_idx" ON "PolicyComments"("organizationPolicyId");

-- CreateIndex
CREATE INDEX "PolicyComments_organizationId_idx" ON "PolicyComments"("organizationId");

-- AddForeignKey
ALTER TABLE "PolicyComments" ADD CONSTRAINT "PolicyComments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyComments" ADD CONSTRAINT "PolicyComments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyComments" ADD CONSTRAINT "PolicyComments_organizationPolicyId_fkey" FOREIGN KEY ("organizationPolicyId") REFERENCES "OrganizationPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
