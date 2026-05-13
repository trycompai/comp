-- CreateIndex
CREATE UNIQUE INDEX "FindingException_organizationId_connectionId_checkId_resourceId_key"
  ON "FindingException"("organizationId", "connectionId", "checkId", "resourceId");
