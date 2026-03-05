-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "keyPrefix" TEXT;

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
