-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "FindingArea" AS ENUM ('people', 'documents', 'compliance');

-- AlterTable: add new columns
ALTER TABLE "Finding" ADD COLUMN "severity" "FindingSeverity" NOT NULL DEFAULT 'medium';
ALTER TABLE "Finding" ADD COLUMN "area" "FindingArea";
ALTER TABLE "Finding" ADD COLUMN "policyId" TEXT;
ALTER TABLE "Finding" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "Finding" ADD COLUMN "riskId" TEXT;
ALTER TABLE "Finding" ADD COLUMN "memberId" TEXT;
ALTER TABLE "Finding" ADD COLUMN "deviceId" TEXT;

-- Backfill: map legacy scope values onto area
UPDATE "Finding"
SET "area" = 'people'::"FindingArea"
WHERE "scope" IN ('people', 'people_tasks', 'people_devices', 'people_chart');

-- Drop legacy scope column + enum
ALTER TABLE "Finding" DROP COLUMN "scope";
DROP TYPE "FindingScope";

-- AddForeignKey
ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_riskId_fkey"
  FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Finding"
  ADD CONSTRAINT "Finding_deviceId_fkey"
  FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Finding_policyId_idx" ON "Finding"("policyId");
CREATE INDEX "Finding_vendorId_idx" ON "Finding"("vendorId");
CREATE INDEX "Finding_riskId_idx" ON "Finding"("riskId");
CREATE INDEX "Finding_memberId_idx" ON "Finding"("memberId");
CREATE INDEX "Finding_deviceId_idx" ON "Finding"("deviceId");
CREATE INDEX "Finding_organizationId_severity_idx" ON "Finding"("organizationId", "severity");
