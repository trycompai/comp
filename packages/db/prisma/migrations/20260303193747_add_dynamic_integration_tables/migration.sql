-- CreateTable
CREATE TABLE "DynamicIntegration" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('din'::text),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "docsUrl" TEXT,
    "baseUrl" TEXT,
    "defaultHeaders" JSONB,
    "authConfig" JSONB NOT NULL,
    "capabilities" JSONB NOT NULL DEFAULT '["checks"]',
    "supportsMultipleConnections" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DynamicCheck" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('dck'::text),
    "integrationId" TEXT NOT NULL,
    "checkSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "taskMapping" TEXT,
    "defaultSeverity" TEXT NOT NULL DEFAULT 'medium',
    "definition" JSONB NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DynamicIntegration_slug_key" ON "DynamicIntegration"("slug");

-- CreateIndex
CREATE INDEX "DynamicIntegration_slug_idx" ON "DynamicIntegration"("slug");

-- CreateIndex
CREATE INDEX "DynamicIntegration_category_idx" ON "DynamicIntegration"("category");

-- CreateIndex
CREATE INDEX "DynamicIntegration_isActive_idx" ON "DynamicIntegration"("isActive");

-- CreateIndex
CREATE INDEX "DynamicCheck_integrationId_idx" ON "DynamicCheck"("integrationId");

-- CreateIndex
CREATE INDEX "DynamicCheck_isEnabled_idx" ON "DynamicCheck"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicCheck_integrationId_checkSlug_key" ON "DynamicCheck"("integrationId", "checkSlug");

-- AddForeignKey
ALTER TABLE "DynamicCheck" ADD CONSTRAINT "DynamicCheck_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "DynamicIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
