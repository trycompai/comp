-- AlterTable
ALTER TABLE "public"."TrustAccessGrant" ADD COLUMN "accessToken" TEXT,
ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "TrustAccessGrant_accessToken_key" ON "public"."TrustAccessGrant"("accessToken");

-- CreateIndex
CREATE INDEX "TrustAccessGrant_accessToken_idx" ON "public"."TrustAccessGrant"("accessToken");
