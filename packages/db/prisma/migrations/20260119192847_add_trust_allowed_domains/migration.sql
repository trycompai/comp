-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];
