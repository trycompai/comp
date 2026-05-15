-- CreateTable
CREATE TABLE "CheckDefinition" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('chd'::text),
    "organizationId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "passCriteria" TEXT NOT NULL,
    "failCriteria" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckDefinition_organizationId_idx" ON "CheckDefinition"("organizationId");

-- CreateIndex
CREATE INDEX "CheckDefinition_checkId_idx" ON "CheckDefinition"("checkId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckDefinition_organizationId_checkId_key" ON "CheckDefinition"("organizationId", "checkId");

-- AddForeignKey
ALTER TABLE "CheckDefinition" ADD CONSTRAINT "CheckDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
