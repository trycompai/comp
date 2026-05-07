-- AlterTable
ALTER TABLE "public"."Trust"
ADD COLUMN     "pipeda" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pipeda_status" "public"."FrameworkStatus" NOT NULL DEFAULT 'started',
ADD COLUMN     "ccpa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ccpa_status" "public"."FrameworkStatus" NOT NULL DEFAULT 'started';

