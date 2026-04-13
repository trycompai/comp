-- AlterTable
ALTER TABLE "TimelineInstance"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedById" TEXT,
ADD COLUMN "unlockedAt" TIMESTAMP(3),
ADD COLUMN "unlockedById" TEXT,
ADD COLUMN "unlockReason" TEXT;

-- AlterTable
ALTER TABLE "TimelinePhase"
ADD COLUMN "regressedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TimelineInstance_lockedById_idx" ON "TimelineInstance"("lockedById");

-- CreateIndex
CREATE INDEX "TimelineInstance_unlockedById_idx" ON "TimelineInstance"("unlockedById");

-- CreateIndex
CREATE INDEX "TimelinePhase_regressedAt_idx" ON "TimelinePhase"("regressedAt");

-- AddForeignKey
ALTER TABLE "TimelineInstance"
ADD CONSTRAINT "TimelineInstance_lockedById_fkey"
FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineInstance"
ADD CONSTRAINT "TimelineInstance_unlockedById_fkey"
FOREIGN KEY ("unlockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
