-- CreateTable
CREATE TABLE "TrustDocument" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tdoc'::text),
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "s3Key" TEXT NOT NULL,
    "scopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrustDocument_organizationId_idx" ON "TrustDocument"("organizationId");

-- CreateIndex
CREATE INDEX "TrustDocument_organizationId_isActive_idx" ON "TrustDocument"("organizationId", "isActive");

-- AddForeignKey
ALTER TABLE "TrustDocument" ADD CONSTRAINT "TrustDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
