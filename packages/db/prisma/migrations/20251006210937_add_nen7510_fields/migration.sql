-- AlterTable
ALTER TABLE "public"."Trust" ADD COLUMN     "nen7510" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nen7510_status" "public"."FrameworkStatus" NOT NULL DEFAULT 'started';
