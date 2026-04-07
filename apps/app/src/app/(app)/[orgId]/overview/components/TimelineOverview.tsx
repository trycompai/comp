'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@trycompai/ui/card';
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
    className: 'bg-zinc-800 text-zinc-400',
  },
  ACTIVE: {
    label: 'Active',
    className: 'bg-green-900 text-green-400',
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-yellow-900 text-yellow-400',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-900 text-green-400',
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

export function TimelineOverview({ initialData }: TimelineOverviewProps) {
  const { timelines } = useTimelines({ initialData });
  const { orgId } = useParams<{ orgId: string }>();

  if (timelines.length === 0) return null;

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle>Compliance Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your progress toward audit readiness
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {timelines.map((timeline) => (
          <TimelineCard
            key={timeline.id}
            timeline={timeline}
            orgId={orgId}
          />
        ))}
      </CardContent>
    </Card>
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
            {frameworkName}
          </span>
          {timeline.cycleNumber > 1 && (
            <span className="text-xs text-muted-foreground shrink-0">
              Cycle {timeline.cycleNumber}
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${badge.className}`}
        >
          {isCompleted && <Checkmark size={12} />}
          {badge.label}
        </span>
      </div>

      <div className="mt-3">
        <TimelinePhaseBar phases={timeline.phases} />
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
          </>
        )}
      </div>
    </Link>
  );
}
