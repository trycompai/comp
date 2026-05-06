-- AlterTable
ALTER TABLE "Risk" ADD COLUMN     "strategyDescriptions" JSONB;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "strategyDescriptions" JSONB;

-- Backfill: seed `strategyDescriptions` with each row's existing
-- `treatmentStrategyDescription` keyed by its current `treatmentStrategy`.
-- Rows without text are left as null so we don't seed empty strings.
UPDATE "Risk"
SET    "strategyDescriptions" = jsonb_build_object(
         "treatmentStrategy"::text,
         "treatmentStrategyDescription"
       )
WHERE  "treatmentStrategyDescription" IS NOT NULL
   AND "treatmentStrategyDescription" <> '';

UPDATE "Vendor"
SET    "strategyDescriptions" = jsonb_build_object(
         "treatmentStrategy"::text,
         "treatmentStrategyDescription"
       )
WHERE  "treatmentStrategyDescription" IS NOT NULL
   AND "treatmentStrategyDescription" <> '';
