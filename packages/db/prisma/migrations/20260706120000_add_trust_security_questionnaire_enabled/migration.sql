-- Add a per-org toggle for the public trust portal's AI-assisted Security
-- Questionnaire. Defaults to true so existing portals keep showing it; org
-- owners can hide it when they'd rather review answers before customers run it.
ALTER TABLE "Trust"
  ADD COLUMN "securityQuestionnaireEnabled" BOOLEAN NOT NULL DEFAULT true;
