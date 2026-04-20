
-- CreateEnum
CREATE TYPE "TimelineStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TimelinePhaseStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PhaseCompletionType" AS ENUM ('AUTO_TASKS', 'AUTO_POLICIES', 'AUTO_PEOPLE', 'AUTO_FINDINGS', 'AUTO_UPLOAD', 'MANUAL');

-- CreateTable
CREATE TABLE "TimelineTemplate" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tml'::text),
    "frameworkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trackKey" TEXT NOT NULL DEFAULT 'primary',
    "cycleNumber" INTEGER NOT NULL,
    "templateKey" TEXT,
    "nextTemplateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelinePhaseTemplate" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tpt'::text),
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupLabel" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "defaultDurationWeeks" INTEGER NOT NULL,
    "completionType" "PhaseCompletionType" NOT NULL DEFAULT 'MANUAL',
    "locksTimelineOnComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelinePhaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineInstance" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tli'::text),
    "organizationId" TEXT NOT NULL,
    "frameworkInstanceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "trackKey" TEXT NOT NULL DEFAULT 'primary',
    "cycleNumber" INTEGER NOT NULL,
    "status" "TimelineStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedById" TEXT,
    "unlockReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelinePhase" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('tlp'::text),
    "instanceId" TEXT NOT NULL,
    "phaseTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupLabel" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "status" "TimelinePhaseStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationWeeks" INTEGER NOT NULL,
    "completionType" "PhaseCompletionType" NOT NULL DEFAULT 'MANUAL',
    "locksTimelineOnComplete" BOOLEAN NOT NULL DEFAULT false,
    "regressedAt" TIMESTAMP(3),
    "datesPinned" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "readyForReview" BOOLEAN NOT NULL DEFAULT false,
    "readyForReviewAt" TIMESTAMP(3),
    "documentUrl" TEXT,
    "documentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelinePhase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimelineTemplate_frameworkId_trackKey_cycleNumber_key" ON "TimelineTemplate"("frameworkId", "trackKey", "cycleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineTemplate_frameworkId_templateKey_key" ON "TimelineTemplate"("frameworkId", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "TimelineInstance_frameworkInstanceId_trackKey_cycleNumber_key" ON "TimelineInstance"("frameworkInstanceId", "trackKey", "cycleNumber");

-- AddForeignKey
ALTER TABLE "TimelineTemplate" ADD CONSTRAINT "TimelineTemplate_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelinePhaseTemplate" ADD CONSTRAINT "TimelinePhaseTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TimelineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineInstance" ADD CONSTRAINT "TimelineInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineInstance" ADD CONSTRAINT "TimelineInstance_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineInstance" ADD CONSTRAINT "TimelineInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TimelineTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineInstance" ADD CONSTRAINT "TimelineInstance_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineInstance" ADD CONSTRAINT "TimelineInstance_unlockedById_fkey" FOREIGN KEY ("unlockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelinePhase" ADD CONSTRAINT "TimelinePhase_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "TimelineInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelinePhase" ADD CONSTRAINT "TimelinePhase_phaseTemplateId_fkey" FOREIGN KEY ("phaseTemplateId") REFERENCES "TimelinePhaseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelinePhase" ADD CONSTRAINT "TimelinePhase_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

