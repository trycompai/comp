-- DropIndex
DROP INDEX "public"."IntegrationConnection_providerId_organizationId_key";

-- CreateIndex
CREATE INDEX "IntegrationConnection_providerId_organizationId_idx" ON "IntegrationConnection"("providerId", "organizationId");
