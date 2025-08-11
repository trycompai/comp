-- Update the default value for the isRequiredToSign field to true
ALTER TABLE "Policy" ALTER COLUMN "isRequiredToSign" SET DEFAULT true;

-- Set all existing policies to be required to sign
UPDATE "Policy" SET "isRequiredToSign" = true WHERE "isRequiredToSign" IS FALSE OR "isRequiredToSign" IS NULL;