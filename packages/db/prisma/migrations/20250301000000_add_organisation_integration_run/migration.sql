-- CreateTable
CREATE TABLE "Organization_integration_run" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "resultDetails" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "organizationIntegrationId" TEXT NOT NULL,
    "executedById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_integration_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_integration_run_organizationIntegrationId_idx" ON "Organization_integration_run"("organizationIntegrationId");
CREATE INDEX "Organization_integration_run_organizationId_idx" ON "Organization_integration_run"("organizationId");

-- AddForeignKey
ALTER TABLE "Organization_integration_run" ADD CONSTRAINT "Organization_integration_run_organizationIntegrationId_fkey" 
    FOREIGN KEY ("organizationIntegrationId") REFERENCES "OrganizationIntegrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization_integration_run" ADD CONSTRAINT "Organization_integration_run_executedById_fkey" 
    FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization_integration_run" ADD CONSTRAINT "Organization_integration_run_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; 