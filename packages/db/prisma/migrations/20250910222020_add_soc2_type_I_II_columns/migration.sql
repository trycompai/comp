-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "soc2typei" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "soc2typei_status" "FrameworkStatus" NOT NULL DEFAULT 'started';

-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "soc2typeii" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "soc2typeii_status" "FrameworkStatus" NOT NULL DEFAULT 'started';
