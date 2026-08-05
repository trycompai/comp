-- AlterTable
ALTER TABLE "OffboardingChecklistCompletion" ADD COLUMN     "exceptionReason" TEXT,
ADD COLUMN     "isException" BOOLEAN NOT NULL DEFAULT false;
