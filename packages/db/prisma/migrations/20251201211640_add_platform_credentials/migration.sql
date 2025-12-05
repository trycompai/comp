-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."IntegrationPlatformCredential" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ipc'::text),
    "providerSlug" TEXT NOT NULL,
    "encryptedClientId" JSONB NOT NULL,
    "encryptedClientSecret" JSONB NOT NULL,
    "customScopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationPlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationPlatformCredential_providerSlug_key" ON "public"."IntegrationPlatformCredential"("providerSlug");

-- CreateIndex
CREATE INDEX "IntegrationPlatformCredential_providerSlug_idx" ON "public"."IntegrationPlatformCredential"("providerSlug");
