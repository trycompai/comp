'use client';

import { useState } from 'react';
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

function getNextMilestone(timelines: Timeline[]): string | null {
  for (const timeline of timelines) {
    if (timeline.status !== 'ACTIVE') continue;
    const inProgress = [...timeline.phases]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .find((p) => p.status === 'IN_PROGRESS');
    if (!inProgress?.endDate) continue;
    const frameworkName =
      timeline.template?.name ??
      timeline.frameworkInstance?.framework.name ??
      'Unknown';
    const dateStr = formatDate(inProgress.endDate);
    return `${frameworkName} ${inProgress.name} due ${dateStr}`;
  }
  return null;
}

function TimelineSummary({ timelines }: { timelines: Timeline[] }) {
  const active = timelines.filter((t) => t.status === 'ACTIVE').length;
  const completed = timelines.filter((t) => t.status === 'COMPLETED').length;
  const nextMilestone = getNextMilestone(timelines);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span>
        <span className="font-medium text-foreground">{active}</span> active
      </span>
      <span>
        <span className="font-medium text-foreground">{completed}</span> completed
      </span>
      {nextMilestone && (
        <>
          <span className="text-border">|</span>
          <span>
            Next milestone: <span className="text-foreground">{nextMilestone}</span>
          </span>
        </>
      )}
    </div>
  );
}

interface FrameworkGroup {
  key: string;
  name: string;
  current: Timeline;
  pastCycles: Timeline[];
}

function groupByFramework(timelines: Timeline[]): FrameworkGroup[] {
  const map = new Map<string, Timeline[]>();

  for (const t of timelines) {
    // Group by template name (e.g., "SOC 2 Type 2") so Type 1 and Type 2 stay separate
    const key = t.template?.name ?? t.frameworkInstanceId;
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }

  const groups: FrameworkGroup[] = [];
  for (const [key, list] of map) {
    // Active/Draft first, then by cycle number descending
    const sorted = [...list].sort((a, b) => {
      const order = { ACTIVE: 0, PAUSED: 1, DRAFT: 2, COMPLETED: 3 };
      const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
      if (diff !== 0) return diff;
      return b.cycleNumber - a.cycleNumber;
    });

    const current = sorted[0];
    const pastCycles = sorted.slice(1);
    const name = current.template?.name ?? current.frameworkInstance?.framework.name ?? key;

    groups.push({ key, name, current, pastCycles });
  }

  return groups;
}

export function TimelineOverview({ initialData }: TimelineOverviewProps) {
  const { timelines } = useTimelines({ initialData });
  const { orgId } = useParams<{ orgId: string }>();

  if (timelines.length === 0) return null;

  const groups = groupByFramework(timelines);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <FrameworkTimelines key={group.key} group={group} orgId={orgId} />
      ))}
    </div>
  );
}

function FrameworkTimelines({
  group,
  orgId,
}: {
  group: FrameworkGroup;
  orgId: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const hasPast = group.pastCycles.length > 0;

  return (
    <div>
      {/* Current/active timeline with stacked card effect */}
      <TimelineCard timeline={group.current} orgId={orgId} className={hasPast ? 'rounded-b-none' : ''} />

      {/* Previous cycles lip + expandable history */}
      {hasPast && (
        <>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-center rounded-b-lg border border-t-0 bg-muted/30 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            {showHistory ? 'Hide previous' : `Show ${group.pastCycles.length} previous cycle${group.pastCycles.length > 1 ? 's' : ''}`}
          </button>
          {showHistory && (
            <div className="mt-2 flex flex-col gap-2">
              {group.pastCycles.map((t) => (
                <div key={t.id} className="opacity-60">
                  <TimelineCard timeline={t} orgId={orgId} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TimelineCard({
  timeline,
  orgId,
  className = '',
}: {
  timeline: Timeline;
  orgId: string;
  className?: string;
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
      } ${className}`}
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

      {(isDraft || (isCompleted && nextCycle)) && (
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          {isDraft && <span>Awaiting start date</span>}
          {isCompleted && nextCycle && (
            <span>Next cycle: {nextCycle}</span>
          )}
        </div>
      )}
    </Link>
  );
}
