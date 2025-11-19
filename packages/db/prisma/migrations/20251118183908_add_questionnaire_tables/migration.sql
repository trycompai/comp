-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('parsing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "QuestionnaireAnswerStatus" AS ENUM ('untouched', 'generated', 'manual');

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('qst'::text),
    "filename" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'parsing',
    "parsedAt" TIMESTAMP(3),
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "answeredQuestions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireQuestionAnswer" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('qqa'::text),
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "QuestionnaireAnswerStatus" NOT NULL DEFAULT 'untouched',
    "questionIndex" INTEGER NOT NULL,
    "sources" JSONB,
    "generatedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionnaireId" TEXT NOT NULL,

    CONSTRAINT "QuestionnaireQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Questionnaire_organizationId_idx" ON "Questionnaire"("organizationId");

-- CreateIndex
CREATE INDEX "Questionnaire_organizationId_createdAt_idx" ON "Questionnaire"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Questionnaire_status_idx" ON "Questionnaire"("status");

-- CreateIndex
CREATE INDEX "QuestionnaireQuestionAnswer_questionnaireId_idx" ON "QuestionnaireQuestionAnswer"("questionnaireId");

-- CreateIndex
CREATE INDEX "QuestionnaireQuestionAnswer_questionnaireId_questionIndex_idx" ON "QuestionnaireQuestionAnswer"("questionnaireId", "questionIndex");

-- CreateIndex
CREATE INDEX "QuestionnaireQuestionAnswer_status_idx" ON "QuestionnaireQuestionAnswer"("status");

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireQuestionAnswer" ADD CONSTRAINT "QuestionnaireQuestionAnswer_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
