-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "whistleblowerReportEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "accessRequestFormEnabled" BOOLEAN NOT NULL DEFAULT true;
