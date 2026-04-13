-- AlterTable
ALTER TABLE "TimelineTemplate"
ADD COLUMN "trackKey" TEXT NOT NULL DEFAULT 'primary';

ALTER TABLE "TimelineInstance"
ADD COLUMN "trackKey" TEXT NOT NULL DEFAULT 'primary';

-- Backfill track keys for known SOC 2 templates
UPDATE "TimelineTemplate"
SET "trackKey" = 'soc2_type1'
WHERE "templateKey" = 'soc2_type1';

UPDATE "TimelineTemplate"
SET "trackKey" = 'soc2_type2'
WHERE "templateKey" IN ('soc2_type2_year1', 'soc2_type2_renewal');

-- Type 1 and Type 2 are independent tracks
UPDATE "TimelineTemplate"
SET "nextTemplateKey" = 'soc2_type1'
WHERE "templateKey" = 'soc2_type1';

-- Rebase SOC 2 Type 2 cycles so the track starts at cycle 1
UPDATE "TimelineTemplate"
SET "cycleNumber" = 1
WHERE "templateKey" = 'soc2_type2_year1';

UPDATE "TimelineTemplate"
SET "cycleNumber" = 2
WHERE "templateKey" = 'soc2_type2_renewal';

-- Backfill instance track keys from the linked template
UPDATE "TimelineInstance" ti
SET "trackKey" = tt."trackKey"
FROM "TimelineTemplate" tt
WHERE ti."templateId" = tt."id";

-- Rebase existing Type 2 instances to independent cycle numbering
UPDATE "TimelineInstance"
SET "cycleNumber" = GREATEST(1, "cycleNumber" - 1)
WHERE "trackKey" = 'soc2_type2';

-- Replace uniqueness constraints to include trackKey
DROP INDEX "TimelineTemplate_frameworkId_cycleNumber_key";
CREATE UNIQUE INDEX "TimelineTemplate_frameworkId_trackKey_cycleNumber_key"
ON "TimelineTemplate"("frameworkId", "trackKey", "cycleNumber");

DROP INDEX "TimelineInstance_frameworkInstanceId_cycleNumber_key";
CREATE UNIQUE INDEX "TimelineInstance_frameworkInstanceId_trackKey_cycleNumber_key"
ON "TimelineInstance"("frameworkInstanceId", "trackKey", "cycleNumber");
