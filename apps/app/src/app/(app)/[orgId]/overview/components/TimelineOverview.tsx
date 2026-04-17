'use client';

import {
  Badge,
  Card,
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
  // Year = how many cycles exist for this framework type (past + current)
  const year = group.pastCycles.length + 1;

  return (
    <TimelineCard
      timeline={group.current}
      orgId={orgId}
      cycleLabel={`Year ${year}`}
    />
  );
}

function TimelineCard({
  timeline,
  orgId,
  cycleLabel,
}: {
  timeline: Timeline;
  orgId: string;
  cycleLabel?: string;
}) {
  const isDraft = timeline.status === 'DRAFT';
  const isCompleted = timeline.status === 'COMPLETED';
  const frameworkName =
    timeline.frameworkInstance?.framework.name ?? 'Unknown Framework';
  const nextCycle = getNextCycleDate(timeline);

  const titleContent = (
    <div className="flex items-center gap-2">
      <Text size="base" weight="semibold">
        {timeline.template?.name ?? frameworkName}
      </Text>
      {cycleLabel && <Badge variant="outline">{cycleLabel}</Badge>}
    </div>
  );

  const statusBadge = (
    <Badge variant={STATUS_VARIANT[timeline.status]}>
      {isCompleted && <Checkmark size={12} />}
      {STATUS_LABEL[timeline.status]}
    </Badge>
  );

  return (
    <Link
      href={`/${orgId}/frameworks/${timeline.frameworkInstanceId}`}
      className={`block transition-opacity hover:opacity-90 ${isDraft ? 'opacity-60' : ''}`}
    >
      <Card
        title={titleContent}
        headerAction={statusBadge}
      >
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
