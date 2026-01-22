-- CreateTable
CREATE TABLE "public"."IntegrationOAuthApp" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ioa'::text),
    "providerSlug" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "encryptedClientId" JSONB NOT NULL,
    "encryptedClientSecret" JSONB NOT NULL,
    "customScopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationOAuthApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationOAuthApp_organizationId_idx" ON "public"."IntegrationOAuthApp"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationOAuthApp_providerSlug_idx" ON "public"."IntegrationOAuthApp"("providerSlug");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationOAuthApp_providerSlug_organizationId_key" ON "public"."IntegrationOAuthApp"("providerSlug", "organizationId");

-- AddForeignKey
ALTER TABLE "public"."IntegrationOAuthApp" ADD CONSTRAINT "IntegrationOAuthApp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
