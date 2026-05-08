-- AlterTable
ALTER TABLE "Risk" ADD COLUMN     "autoLinkRunId" TEXT,
ADD COLUMN     "autoLinkRunStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "autoLinkRunId" TEXT,
ADD COLUMN     "autoLinkRunStartedAt" TIMESTAMP(3);
