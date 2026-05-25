-- CreateTable
CREATE TABLE "FrameworkControlFamily" (
    "frameworkInstanceId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "controlFamily" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkControlFamily_frameworkInstanceId_controlId_key" ON "FrameworkControlFamily"("frameworkInstanceId", "controlId");

-- CreateIndex
CREATE INDEX "FrameworkControlFamily_frameworkInstanceId_idx" ON "FrameworkControlFamily"("frameworkInstanceId");

-- CreateIndex
CREATE INDEX "FrameworkControlFamily_controlId_idx" ON "FrameworkControlFamily"("controlId");

-- Migrate existing data: copy controlFamily from Control into FrameworkControlFamily
-- for every (frameworkInstance, control) pair that has a requirementMap edge.
INSERT INTO "FrameworkControlFamily" ("frameworkInstanceId", "controlId", "controlFamily")
SELECT DISTINCT rm."frameworkInstanceId", c."id", c."controlFamily"
FROM "Control" c
JOIN "RequirementMap" rm ON rm."controlId" = c."id"
WHERE c."controlFamily" IS NOT NULL
  AND rm."archivedAt" IS NULL
ON CONFLICT ("frameworkInstanceId", "controlId") DO NOTHING;

-- AlterTable
ALTER TABLE "Control" DROP COLUMN "controlFamily";

-- AddForeignKey
ALTER TABLE "FrameworkControlFamily" ADD CONSTRAINT "FrameworkControlFamily_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlFamily" ADD CONSTRAINT "FrameworkControlFamily_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;
