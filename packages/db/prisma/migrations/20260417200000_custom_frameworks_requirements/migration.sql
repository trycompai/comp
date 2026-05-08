-- AlterTable
ALTER TABLE "FrameworkEditorFramework" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "FrameworkEditorRequirement" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "FrameworkEditorFramework_organizationId_idx" ON "FrameworkEditorFramework"("organizationId");

-- CreateIndex
CREATE INDEX "FrameworkEditorRequirement_organizationId_idx" ON "FrameworkEditorRequirement"("organizationId");

-- CreateIndex
CREATE INDEX "FrameworkEditorRequirement_frameworkId_idx" ON "FrameworkEditorRequirement"("frameworkId");

-- AddForeignKey
ALTER TABLE "FrameworkEditorFramework" ADD CONSTRAINT "FrameworkEditorFramework_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorRequirement" ADD CONSTRAINT "FrameworkEditorRequirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
