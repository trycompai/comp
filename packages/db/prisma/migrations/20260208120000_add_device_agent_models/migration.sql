-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('macos', 'windows');

-- CreateEnum
CREATE TYPE "DeviceCheckType" AS ENUM ('disk_encryption', 'antivirus', 'password_policy', 'screen_lock');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('dev'::text),
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "osVersion" TEXT NOT NULL,
    "serialNumber" TEXT,
    "hardwareModel" TEXT,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isCompliant" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckIn" TIMESTAMPTZ,
    "agentVersion" TEXT,
    "installedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCheck" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('dck'::text),
    "deviceId" TEXT NOT NULL,
    "checkType" "DeviceCheckType" NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "details" JSONB,
    "checkedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_serialNumber_organizationId_key" ON "Device"("serialNumber", "organizationId");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_organizationId_idx" ON "Device"("organizationId");

-- CreateIndex
CREATE INDEX "Device_isCompliant_idx" ON "Device"("isCompliant");

-- CreateIndex
CREATE INDEX "DeviceCheck_deviceId_idx" ON "DeviceCheck"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceCheck_checkType_idx" ON "DeviceCheck"("checkType");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCheck" ADD CONSTRAINT "DeviceCheck_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
