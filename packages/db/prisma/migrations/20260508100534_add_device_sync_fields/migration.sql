-- CreateEnum
CREATE TYPE "DeviceSource" AS ENUM ('agent', 'fleet', 'integration');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "externalDeviceId" TEXT,
ADD COLUMN     "integrationConnectionId" TEXT,
ADD COLUMN     "source" "DeviceSource" NOT NULL DEFAULT 'agent';

-- AlterTable
ALTER TABLE "DynamicIntegration" ADD COLUMN     "deviceSyncDefinition" JSONB;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "deviceSyncProvider" TEXT;

-- CreateIndex
CREATE INDEX "Device_integrationConnectionId_idx" ON "Device"("integrationConnectionId");
