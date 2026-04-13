-- AlterTable
ALTER TABLE "TimelinePhase" ADD COLUMN     "locksTimelineOnComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TimelinePhaseTemplate" ADD COLUMN     "locksTimelineOnComplete" BOOLEAN NOT NULL DEFAULT false;
