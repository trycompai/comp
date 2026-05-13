-- CreateTable
CREATE TABLE "FrameworkEditorControlPolicyTemplateLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fcp'::text),
    "frameworkId" TEXT NOT NULL,
    "controlTemplateId" TEXT NOT NULL,
    "policyTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorControlPolicyTemplateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkEditorControlTaskTemplateLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fct'::text),
    "frameworkId" TEXT NOT NULL,
    "controlTemplateId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorControlTaskTemplateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkEditorControlDocumentTypeLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fcd'::text),
    "frameworkId" TEXT NOT NULL,
    "controlTemplateId" TEXT NOT NULL,
    "formType" "EvidenceFormType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorControlDocumentTypeLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkControlPolicyLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fpl'::text),
    "frameworkInstanceId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkControlPolicyLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkControlTaskLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ftl'::text),
    "frameworkInstanceId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkControlTaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkControlDocumentTypeLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fdl'::text),
    "frameworkInstanceId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "formType" "EvidenceFormType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkControlDocumentTypeLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrameworkEditorControlPolicyTemplateLink_controlTemplateId_idx" ON "FrameworkEditorControlPolicyTemplateLink"("controlTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlPolicyTemplateLink_policyTemplateId_idx" ON "FrameworkEditorControlPolicyTemplateLink"("policyTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorControlPolicyTemplateLink_frameworkId_contro_key" ON "FrameworkEditorControlPolicyTemplateLink"("frameworkId", "controlTemplateId", "policyTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlTaskTemplateLink_controlTemplateId_idx" ON "FrameworkEditorControlTaskTemplateLink"("controlTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlTaskTemplateLink_taskTemplateId_idx" ON "FrameworkEditorControlTaskTemplateLink"("taskTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorControlTaskTemplateLink_frameworkId_controlT_key" ON "FrameworkEditorControlTaskTemplateLink"("frameworkId", "controlTemplateId", "taskTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlDocumentTypeLink_controlTemplateId_idx" ON "FrameworkEditorControlDocumentTypeLink"("controlTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorControlDocumentTypeLink_frameworkId_controlT_key" ON "FrameworkEditorControlDocumentTypeLink"("frameworkId", "controlTemplateId", "formType");

-- CreateIndex
CREATE INDEX "FrameworkControlPolicyLink_controlId_idx" ON "FrameworkControlPolicyLink"("controlId");

-- CreateIndex
CREATE INDEX "FrameworkControlPolicyLink_policyId_idx" ON "FrameworkControlPolicyLink"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkControlPolicyLink_frameworkInstanceId_controlId_po_key" ON "FrameworkControlPolicyLink"("frameworkInstanceId", "controlId", "policyId");

-- CreateIndex
CREATE INDEX "FrameworkControlTaskLink_controlId_idx" ON "FrameworkControlTaskLink"("controlId");

-- CreateIndex
CREATE INDEX "FrameworkControlTaskLink_taskId_idx" ON "FrameworkControlTaskLink"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkControlTaskLink_frameworkInstanceId_controlId_task_key" ON "FrameworkControlTaskLink"("frameworkInstanceId", "controlId", "taskId");

-- CreateIndex
CREATE INDEX "FrameworkControlDocumentTypeLink_controlId_idx" ON "FrameworkControlDocumentTypeLink"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkControlDocumentTypeLink_frameworkInstanceId_contro_key" ON "FrameworkControlDocumentTypeLink"("frameworkInstanceId", "controlId", "formType");

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlPolicyTemplateLink" ADD CONSTRAINT "FrameworkEditorControlPolicyTemplateLink_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlPolicyTemplateLink" ADD CONSTRAINT "FrameworkEditorControlPolicyTemplateLink_controlTemplateId_fkey" FOREIGN KEY ("controlTemplateId") REFERENCES "FrameworkEditorControlTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlPolicyTemplateLink" ADD CONSTRAINT "FrameworkEditorControlPolicyTemplateLink_policyTemplateId_fkey" FOREIGN KEY ("policyTemplateId") REFERENCES "FrameworkEditorPolicyTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlTaskTemplateLink" ADD CONSTRAINT "FrameworkEditorControlTaskTemplateLink_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlTaskTemplateLink" ADD CONSTRAINT "FrameworkEditorControlTaskTemplateLink_controlTemplateId_fkey" FOREIGN KEY ("controlTemplateId") REFERENCES "FrameworkEditorControlTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlTaskTemplateLink" ADD CONSTRAINT "FrameworkEditorControlTaskTemplateLink_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "FrameworkEditorTaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlDocumentTypeLink" ADD CONSTRAINT "FrameworkEditorControlDocumentTypeLink_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlDocumentTypeLink" ADD CONSTRAINT "FrameworkEditorControlDocumentTypeLink_controlTemplateId_fkey" FOREIGN KEY ("controlTemplateId") REFERENCES "FrameworkEditorControlTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlPolicyLink" ADD CONSTRAINT "FrameworkControlPolicyLink_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlPolicyLink" ADD CONSTRAINT "FrameworkControlPolicyLink_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlPolicyLink" ADD CONSTRAINT "FrameworkControlPolicyLink_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlTaskLink" ADD CONSTRAINT "FrameworkControlTaskLink_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlTaskLink" ADD CONSTRAINT "FrameworkControlTaskLink_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlTaskLink" ADD CONSTRAINT "FrameworkControlTaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlDocumentTypeLink" ADD CONSTRAINT "FrameworkControlDocumentTypeLink_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlDocumentTypeLink" ADD CONSTRAINT "FrameworkControlDocumentTypeLink_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;
