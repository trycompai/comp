'use client';

import { Checkmark } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTimelines, type Timeline } from '@/hooks/use-timelines';
import { TimelinePhaseBar } from './TimelinePhaseBar';

interface TimelineOverviewProps {
  initialData?: Timeline[];
}

const STATUS_BADGE: Record<
  Timeline['status'],
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-primary/15 text-primary',
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-destructive/15 text-destructive',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-primary/15 text-primary',
  },
};

function formatDate(date: string | Date | null): string {
  if (!date) return '\u2014';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function estimatedEndDate(timeline: Timeline): string | null {
  if (!timeline.startDate || timeline.phases.length === 0) return null;
  const lastPhase = [...timeline.phases].sort(
    (a, b) => b.orderIndex - a.orderIndex,
  )[0];
  return lastPhase?.endDate ?? null;
}

function getNextCycleDate(timeline: Timeline): string | null {
  if (timeline.status !== 'COMPLETED' || !timeline.completedAt) return null;
  const completedAt = new Date(timeline.completedAt);
  const frameworkName =
    timeline.frameworkInstance?.framework.name ?? '';
  const isSoc2Type2 =
    /SOC 2/i.test(frameworkName) &&
    !/v\.1/i.test(frameworkName) &&
    !/Type 1/i.test(frameworkName);
  const monthsToAdd = isSoc2Type2 ? 6 : 12;
  const nextDate = new Date(completedAt);
  nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
  return formatDate(nextDate);
}

export function TimelineOverview({ initialData }: TimelineOverviewProps) {
  const { timelines } = useTimelines({ initialData });
  const { orgId } = useParams<{ orgId: string }>();

  if (timelines.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">Compliance Timeline</h3>
        <p className="text-sm text-muted-foreground">
          Track your progress toward audit readiness
        </p>
      </div>
      {timelines.map((timeline) => (
        <TimelineCard
          key={timeline.id}
          timeline={timeline}
          orgId={orgId}
        />
      ))}
    </div>
  );
}

function TimelineCard({
  timeline,
  orgId,
}: {
  timeline: Timeline;
  orgId: string;
}) {
  const isDraft = timeline.status === 'DRAFT';
  const isCompleted = timeline.status === 'COMPLETED';
  const badge = STATUS_BADGE[timeline.status];
  const frameworkName =
    timeline.frameworkInstance?.framework.name ?? 'Unknown Framework';
  const endDate = estimatedEndDate(timeline);
  const nextCycle = getNextCycleDate(timeline);

  return (
    <Link
      href={`/${orgId}/frameworks/${timeline.frameworkInstanceId}`}
      className={`block rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
        isDraft ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">
            {timeline.template?.name ?? frameworkName}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${badge.className}`}
        >
          {isCompleted && <Checkmark size={12} />}
          {badge.label}
        </span>
      </div>

      <div className="mt-3">
        <TimelinePhaseBar phases={timeline.phases} showDates />
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        {isDraft ? (
          <span>Awaiting start date</span>
        ) : (
          <>
            <span>Started {formatDate(timeline.startDate)}</span>
            <span>
              {isCompleted
                ? `Completed ${formatDate(timeline.completedAt)}`
                : `Est. completion ${formatDate(endDate)}`}
            </span>
            {isCompleted && nextCycle && (
              <span>Next cycle: {nextCycle}</span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}
