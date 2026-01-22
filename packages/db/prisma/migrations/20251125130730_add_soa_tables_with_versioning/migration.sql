-- CreateEnum
CREATE TYPE "SOADocumentStatus" AS ENUM ('draft', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "SOAAnswerStatus" AS ENUM ('untouched', 'generated', 'manual');

-- CreateTable
CREATE TABLE "SOAFrameworkConfiguration" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('soa_cfg'::text),
    "frameworkId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "columns" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SOAFrameworkConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOADocument" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('soa_doc'::text),
    "frameworkId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "status" "SOADocumentStatus" NOT NULL DEFAULT 'draft',
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "answeredQuestions" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SOADocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SOAAnswer" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('soa_ans'::text),
    "documentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "status" "SOAAnswerStatus" NOT NULL DEFAULT 'untouched',
    "sources" JSONB,
    "generatedAt" TIMESTAMP(3),
    "answerVersion" INTEGER NOT NULL DEFAULT 1,
    "isLatestAnswer" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SOAAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SOAFrameworkConfiguration_frameworkId_idx" ON "SOAFrameworkConfiguration"("frameworkId");

-- CreateIndex
CREATE INDEX "SOAFrameworkConfiguration_frameworkId_version_idx" ON "SOAFrameworkConfiguration"("frameworkId", "version");

-- CreateIndex
CREATE INDEX "SOAFrameworkConfiguration_frameworkId_isLatest_idx" ON "SOAFrameworkConfiguration"("frameworkId", "isLatest");

-- CreateIndex
CREATE INDEX "SOADocument_frameworkId_organizationId_idx" ON "SOADocument"("frameworkId", "organizationId");

-- CreateIndex
CREATE INDEX "SOADocument_frameworkId_organizationId_version_idx" ON "SOADocument"("frameworkId", "organizationId", "version");

-- CreateIndex
CREATE INDEX "SOADocument_frameworkId_organizationId_isLatest_idx" ON "SOADocument"("frameworkId", "organizationId", "isLatest");

-- CreateIndex
CREATE INDEX "SOADocument_configurationId_idx" ON "SOADocument"("configurationId");

-- CreateIndex
CREATE INDEX "SOADocument_status_idx" ON "SOADocument"("status");

-- CreateIndex
CREATE INDEX "SOAAnswer_documentId_idx" ON "SOAAnswer"("documentId");

-- CreateIndex
CREATE INDEX "SOAAnswer_documentId_questionId_idx" ON "SOAAnswer"("documentId", "questionId");

-- CreateIndex
CREATE INDEX "SOAAnswer_documentId_questionId_isLatestAnswer_idx" ON "SOAAnswer"("documentId", "questionId", "isLatestAnswer");

-- CreateIndex
CREATE INDEX "SOAAnswer_status_idx" ON "SOAAnswer"("status");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX "SOAFrameworkConfiguration_frameworkId_version_key" ON "SOAFrameworkConfiguration"("frameworkId", "version");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX "SOADocument_frameworkId_organizationId_version_key" ON "SOADocument"("frameworkId", "organizationId", "version");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX "SOAAnswer_documentId_questionId_answerVersion_key" ON "SOAAnswer"("documentId", "questionId", "answerVersion");

-- AddForeignKey
ALTER TABLE "SOAFrameworkConfiguration" ADD CONSTRAINT "SOAFrameworkConfiguration_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOADocument" ADD CONSTRAINT "SOADocument_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOADocument" ADD CONSTRAINT "SOADocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOADocument" ADD CONSTRAINT "SOADocument_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "SOAFrameworkConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SOAAnswer" ADD CONSTRAINT "SOAAnswer_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SOADocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

