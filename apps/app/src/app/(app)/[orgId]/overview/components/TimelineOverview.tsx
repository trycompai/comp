'use client';

import { useState } from 'react';
import {
  Badge,
  Card,
  CardContent,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Checkmark } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTimelines, type Timeline } from '@/hooks/use-timelines';
import { TimelinePhaseBar } from './TimelinePhaseBar';

interface TimelineOverviewProps {
  initialData?: Timeline[];
}

const STATUS_VARIANT: Record<
  Timeline['status'],
  'default' | 'outline' | 'destructive'
> = {
  DRAFT: 'outline',
  ACTIVE: 'default',
  PAUSED: 'destructive',
  COMPLETED: 'default',
};

const STATUS_LABEL: Record<Timeline['status'], string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
};

function formatDate(date: string | Date | null): string {
  if (!date) return '\u2014';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

interface FrameworkGroup {
  key: string;
  name: string;
  current: Timeline;
  pastCycles: Timeline[];
}

function groupByFramework(timelines: Timeline[]): FrameworkGroup[] {
  const map = new Map<string, Timeline[]>();

  for (const t of timelines) {
    const key = t.template?.name ?? t.frameworkInstanceId;
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }

  const groups: FrameworkGroup[] = [];
  for (const [key, list] of map) {
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
    <Stack gap="md">
      {groups.map((group) => (
        <FrameworkTimelines key={group.key} group={group} orgId={orgId} />
      ))}
    </Stack>
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
      <TimelineCard
        timeline={group.current}
        orgId={orgId}
        roundedBottom={!hasPast}
      />

      {hasPast && (
        <>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-center rounded-b-lg border border-t-0 py-1 text-[11px] text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          >
            {showHistory
              ? 'Hide previous'
              : `Show ${group.pastCycles.length} previous cycle${group.pastCycles.length > 1 ? 's' : ''}`}
          </button>
          {showHistory && (
            <Stack gap="sm">
              <div className="mt-2" />
              {group.pastCycles.map((t) => (
                <div key={t.id} className="opacity-60">
                  <TimelineCard timeline={t} orgId={orgId} />
                </div>
              ))}
            </Stack>
          )}
        </>
      )}
    </div>
  );
}

function TimelineCard({
  timeline,
  orgId,
  roundedBottom = true,
}: {
  timeline: Timeline;
  orgId: string;
  roundedBottom?: boolean;
}) {
  const isDraft = timeline.status === 'DRAFT';
  const isCompleted = timeline.status === 'COMPLETED';
  const frameworkName =
    timeline.frameworkInstance?.framework.name ?? 'Unknown Framework';
  const nextCycle = getNextCycleDate(timeline);

  return (
    <Link href={`/${orgId}/frameworks/${timeline.frameworkInstanceId}`}>
      <Card className={`p-5 transition-colors hover:bg-muted/30 ${isDraft ? 'opacity-60' : ''} ${roundedBottom ? '' : 'rounded-b-none'}`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <Text size="base" weight="semibold">
              {timeline.template?.name ?? frameworkName}
            </Text>
          </div>
          <Badge variant={STATUS_VARIANT[timeline.status]}>
            {isCompleted && <Checkmark size={12} />}
            {STATUS_LABEL[timeline.status]}
          </Badge>
        </div>

        <TimelinePhaseBar phases={timeline.phases} showDates />

        {isDraft && (
          <div className="mt-3">
            <Text size="xs" variant="muted">Awaiting start date</Text>
          </div>
        )}
        {isCompleted && nextCycle && (
          <div className="mt-3">
            <Text size="xs" variant="muted">Next cycle: {nextCycle}</Text>
          </div>
        )}
      </Card>
    </Link>
  );
}
