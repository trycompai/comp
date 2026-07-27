-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "allowedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];
