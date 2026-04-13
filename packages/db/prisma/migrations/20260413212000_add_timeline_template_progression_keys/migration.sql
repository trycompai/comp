-- AlterTable
ALTER TABLE "TimelineTemplate"
ADD COLUMN "templateKey" TEXT,
ADD COLUMN "nextTemplateKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TimelineTemplate_frameworkId_templateKey_key"
ON "TimelineTemplate"("frameworkId", "templateKey");
