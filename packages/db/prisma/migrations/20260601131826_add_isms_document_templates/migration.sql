-- AlterTable
ALTER TABLE "IsmsDocument" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "FrameworkEditorIsmsDocumentTemplate" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('frk_isd'::text),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "documentType" "IsmsDocumentType" NOT NULL,
    "clause" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorIsmsDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkEditorIsmsDocumentRequirementLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('frk_idr'::text),
    "frameworkId" TEXT NOT NULL,
    "ismsDocumentTemplateId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorIsmsDocumentTemplate_documentType_key" ON "FrameworkEditorIsmsDocumentTemplate"("documentType");

-- CreateIndex
CREATE INDEX "FrameworkEditorIsmsDocumentRequirementLink_ismsDocumentTemp_idx" ON "FrameworkEditorIsmsDocumentRequirementLink"("ismsDocumentTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorIsmsDocumentRequirementLink_requirementId_idx" ON "FrameworkEditorIsmsDocumentRequirementLink"("requirementId");

-- CreateIndex
CREATE INDEX "FrameworkEditorIsmsDocumentRequirementLink_frameworkId_idx" ON "FrameworkEditorIsmsDocumentRequirementLink"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorIsmsDocumentRequirementLink_frameworkId_isms_key" ON "FrameworkEditorIsmsDocumentRequirementLink"("frameworkId", "ismsDocumentTemplateId", "requirementId");

-- AddForeignKey
ALTER TABLE "FrameworkEditorIsmsDocumentRequirementLink" ADD CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorIsmsDocumentRequirementLink" ADD CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_ismsDocumentTem_fkey" FOREIGN KEY ("ismsDocumentTemplateId") REFERENCES "FrameworkEditorIsmsDocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorIsmsDocumentRequirementLink" ADD CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FrameworkEditorRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FrameworkEditorIsmsDocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
