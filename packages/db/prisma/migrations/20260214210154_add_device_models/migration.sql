-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('macos', 'windows', 'linux');

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('dev'::text),
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "osVersion" TEXT NOT NULL,
    "serialNumber" TEXT,
    "hardwareModel" TEXT,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isCompliant" BOOLEAN NOT NULL DEFAULT false,
    "diskEncryptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antivirusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "passwordPolicySet" BOOLEAN NOT NULL DEFAULT false,
    "screenLockEnabled" BOOLEAN NOT NULL DEFAULT false,
    "checkDetails" JSONB,
    "lastCheckIn" TIMESTAMP(3),
    "agentVersion" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device_memberId_idx" ON "Device"("memberId");

-- CreateIndex
CREATE INDEX "Device_organizationId_idx" ON "Device"("organizationId");

-- CreateIndex
CREATE INDEX "Device_isCompliant_idx" ON "Device"("isCompliant");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serialNumber_organizationId_key" ON "Device"("serialNumber", "organizationId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
