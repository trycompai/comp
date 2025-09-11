-- CreateEnum
CREATE TYPE "public"."PolicyDisplayFormat" AS ENUM ('EDITOR', 'PDF');

-- AlterTable
ALTER TABLE "public"."Policy" ADD COLUMN     "displayFormat" "public"."PolicyDisplayFormat" NOT NULL DEFAULT 'EDITOR',
ADD COLUMN     "pdfUrl" TEXT;
