-- AlterTable
ALTER TABLE "public"."Trust" ADD COLUMN     "iso9001" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iso9001_status" "public"."FrameworkStatus" NOT NULL DEFAULT 'started';

