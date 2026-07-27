-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "sourceCompliance" JSONB;

-- AlterTable
ALTER TABLE "FrameworkEditorFrameworkFamily" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
