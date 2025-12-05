-- AlterTable: Add createdAt column to Invitation model
ALTER TABLE "Invitation" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

