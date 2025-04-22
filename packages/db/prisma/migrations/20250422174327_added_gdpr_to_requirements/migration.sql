-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A4';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A5';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A6';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A7';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A12';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A13';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A14';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A15';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A16';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A17';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A18';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A20';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A21';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A25';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A30';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A32';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A33';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A34';
ALTER TYPE "RequirementId" ADD VALUE 'gdpr_A35';
