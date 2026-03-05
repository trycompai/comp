-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];
