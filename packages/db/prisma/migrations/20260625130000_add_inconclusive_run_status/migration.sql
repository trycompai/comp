-- Self-heal layer: a check that fails for a non-customer reason (our bug, a
-- changed/deprecated vendor endpoint, transient error) is held as 'inconclusive'
-- rather than shown to the customer as a red 'failed'. Additive enum value only.

-- AlterEnum
ALTER TYPE "IntegrationRunStatus" ADD VALUE 'inconclusive';
