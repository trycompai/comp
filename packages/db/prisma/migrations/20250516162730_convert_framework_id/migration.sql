-- SOC2 requirementId mapping (old -> new)
-- soc2 -> frk_682734f304cbbfdb3a9d4f44

-- Update RequirementMap table for SOC2 requirements
UPDATE "FrameworkInstance" SET "frameworkId" = 'frk_682734f304cbbfdb3a9d4f44' WHERE "frameworkId" = 'soc2';