-- CreateTable
CREATE TABLE "Organization_integration_results" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "label" TEXT,
    "resultDetails" JSONB,
    "completedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "organizationIntegrationId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assignedUserId" TEXT NOT NULL,

    CONSTRAINT "Organization_integration_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_integration_results_organizationIntegrationId_idx" ON "Organization_integration_results"("organizationIntegrationId");

-- CreateIndex
CREATE INDEX "Organization_integration_results_organizationId_idx" ON "Organization_integration_results"("organizationId");

-- CreateIndex
CREATE INDEX "Organization_integration_results_assignedUserId_idx" ON "Organization_integration_results"("assignedUserId");

-- AddForeignKey
ALTER TABLE "Organization_integration_results" ADD CONSTRAINT "Organization_integration_results_organizationIntegrationId_fkey" FOREIGN KEY ("organizationIntegrationId") REFERENCES "OrganizationIntegrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization_integration_results" ADD CONSTRAINT "Organization_integration_results_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization_integration_results" ADD CONSTRAINT "Organization_integration_results_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
