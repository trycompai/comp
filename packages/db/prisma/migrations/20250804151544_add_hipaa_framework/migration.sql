-- AlterTable
ALTER TABLE "public"."Trust" ADD COLUMN     "hipaa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hipaa_status" "public"."FrameworkStatus" NOT NULL DEFAULT 'started';
