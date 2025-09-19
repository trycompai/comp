-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "iso42001" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "iso42001_status" "FrameworkStatus" NOT NULL DEFAULT 'started';
