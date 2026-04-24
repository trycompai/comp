-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "agentSessionId" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "deviceAgent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Device_agentSessionId_idx" ON "Device"("agentSessionId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_deviceAgent_idx" ON "Session"("deviceAgent");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
