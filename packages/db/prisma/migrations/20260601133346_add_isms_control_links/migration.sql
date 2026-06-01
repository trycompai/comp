-- CreateTable
CREATE TABLE "FrameworkEditorControlIsmsDocumentLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fcid'::text),
    "frameworkId" TEXT NOT NULL,
    "controlTemplateId" TEXT NOT NULL,
    "ismsDocumentTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsDocumentControlLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('idc'::text),
    "ismsDocumentId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IsmsDocumentControlLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrameworkEditorControlIsmsDocumentLink_controlTemplateId_idx" ON "FrameworkEditorControlIsmsDocumentLink"("controlTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlIsmsDocumentLink_ismsDocumentTemplate_idx" ON "FrameworkEditorControlIsmsDocumentLink"("ismsDocumentTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlIsmsDocumentLink_frameworkId_idx" ON "FrameworkEditorControlIsmsDocumentLink"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorControlIsmsDocumentLink_frameworkId_controlT_key" ON "FrameworkEditorControlIsmsDocumentLink"("frameworkId", "controlTemplateId", "ismsDocumentTemplateId");

-- CreateIndex
CREATE INDEX "IsmsDocumentControlLink_ismsDocumentId_idx" ON "IsmsDocumentControlLink"("ismsDocumentId");

-- CreateIndex
CREATE INDEX "IsmsDocumentControlLink_controlId_idx" ON "IsmsDocumentControlLink"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsDocumentControlLink_ismsDocumentId_controlId_key" ON "IsmsDocumentControlLink"("ismsDocumentId", "controlId");

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlIsmsDocumentLink" ADD CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlIsmsDocumentLink" ADD CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_controlTemplateId_fkey" FOREIGN KEY ("controlTemplateId") REFERENCES "FrameworkEditorControlTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlIsmsDocumentLink" ADD CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_ismsDocumentTemplat_fkey" FOREIGN KEY ("ismsDocumentTemplateId") REFERENCES "FrameworkEditorIsmsDocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocumentControlLink" ADD CONSTRAINT "IsmsDocumentControlLink_ismsDocumentId_fkey" FOREIGN KEY ("ismsDocumentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocumentControlLink" ADD CONSTRAINT "IsmsDocumentControlLink_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;
