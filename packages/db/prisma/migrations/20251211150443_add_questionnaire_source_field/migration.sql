-- AlterTable
ALTER TABLE "Questionnaire" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'internal';

-- CreateIndex
CREATE INDEX "Questionnaire_source_idx" ON "Questionnaire"("source");
