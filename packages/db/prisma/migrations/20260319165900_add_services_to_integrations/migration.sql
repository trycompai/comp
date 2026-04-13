-- AlterTable
ALTER TABLE "DynamicCheck" ADD COLUMN     "service" TEXT;

-- AlterTable
ALTER TABLE "DynamicIntegration" ADD COLUMN     "services" JSONB;
