-- CreateTable
CREATE TABLE "SecurityQuestionnaireManualAnswer" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('sqma'::text),
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceQuestionnaireId" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "SecurityQuestionnaireManualAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityQuestionnaireManualAnswer_organizationId_idx" ON "SecurityQuestionnaireManualAnswer"("organizationId");

-- CreateIndex
CREATE INDEX "SecurityQuestionnaireManualAnswer_organizationId_question_idx" ON "SecurityQuestionnaireManualAnswer"("organizationId", "question");

-- CreateIndex
CREATE INDEX "SecurityQuestionnaireManualAnswer_tags_idx" ON "SecurityQuestionnaireManualAnswer"("tags");

-- CreateIndex
CREATE INDEX "SecurityQuestionnaireManualAnswer_createdAt_idx" ON "SecurityQuestionnaireManualAnswer"("createdAt");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "SecurityQuestionnaireManualAnswer_organizationId_question_key" ON "SecurityQuestionnaireManualAnswer"("organizationId", "question");

-- AddForeignKey
ALTER TABLE "SecurityQuestionnaireManualAnswer" ADD CONSTRAINT "SecurityQuestionnaireManualAnswer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityQuestionnaireManualAnswer" ADD CONSTRAINT "SecurityQuestionnaireManualAnswer_sourceQuestionnaireId_fkey" FOREIGN KEY ("sourceQuestionnaireId") REFERENCES "Questionnaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;
