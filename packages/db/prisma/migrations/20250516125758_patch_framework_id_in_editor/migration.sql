-- Update all references to SOC 2 framework IDs to the new ID in framework editor tables
-- Set new ID arbitrarily to frk_682734f304cbbfdb3a9d4f44

UPDATE "FrameworkEditorFramework"
SET "id" = 'frk_682734f304cbbfdb3a9d4f44'
WHERE "id" = 'soc2';