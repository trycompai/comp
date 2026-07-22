-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "createdByMemberId" TEXT;

-- CreateIndex
CREATE INDEX "ApiKey_createdByMemberId_idx" ON "ApiKey"("createdByMemberId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
