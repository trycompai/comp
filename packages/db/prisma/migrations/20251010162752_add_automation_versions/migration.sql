-- CreateTable
CREATE TABLE "public"."EvidenceAutomationVersion" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('eav'::text),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "evidenceAutomationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "scriptKey" TEXT NOT NULL,
    "publishedBy" TEXT,
    "changelog" TEXT,

    CONSTRAINT "EvidenceAutomationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceAutomationVersion_evidenceAutomationId_idx" ON "public"."EvidenceAutomationVersion"("evidenceAutomationId");

-- CreateIndex
CREATE INDEX "EvidenceAutomationVersion_createdAt_idx" ON "public"."EvidenceAutomationVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceAutomationVersion_evidenceAutomationId_version_key" ON "public"."EvidenceAutomationVersion"("evidenceAutomationId", "version");

-- AddForeignKey
ALTER TABLE "public"."EvidenceAutomationVersion" ADD CONSTRAINT "EvidenceAutomationVersion_evidenceAutomationId_fkey" FOREIGN KEY ("evidenceAutomationId") REFERENCES "public"."EvidenceAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
