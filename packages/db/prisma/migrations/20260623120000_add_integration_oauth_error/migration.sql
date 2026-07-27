-- CreateTable
CREATE TABLE "IntegrationOAuthError" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ioe'::text),
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "providerSlug" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationOAuthError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationOAuthError_organizationId_providerSlug_idx" ON "IntegrationOAuthError"("organizationId", "providerSlug");

-- CreateIndex
CREATE INDEX "IntegrationOAuthError_createdAt_idx" ON "IntegrationOAuthError"("createdAt");
