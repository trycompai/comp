-- CreateTable
CREATE TABLE "EvidenceFormSetting" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('efs'::text),
  "organizationId" TEXT NOT NULL,
  "formType" "EvidenceFormType" NOT NULL,
  "isNotRelevant" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EvidenceFormSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceFormSetting_organizationId_formType_key" ON "EvidenceFormSetting"("organizationId", "formType");

-- CreateIndex
CREATE INDEX "EvidenceFormSetting_organizationId_idx" ON "EvidenceFormSetting"("organizationId");

-- CreateIndex
CREATE INDEX "EvidenceFormSetting_organizationId_isNotRelevant_idx" ON "EvidenceFormSetting"("organizationId", "isNotRelevant");

-- AddForeignKey
ALTER TABLE "EvidenceFormSetting" ADD CONSTRAINT "EvidenceFormSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
