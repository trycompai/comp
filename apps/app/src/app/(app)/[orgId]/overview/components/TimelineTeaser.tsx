'use client';

import { ArrowRight } from '@trycompai/design-system/icons';
import type { Timeline } from '@/hooks/use-timelines';

interface TimelineTeaserProps {
  timelines: Timeline[];
  onSwitchTab: () => void;
}

function getActivePhase(timeline: Timeline) {
  return [...timeline.phases]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .find((p) => p.status === 'IN_PROGRESS');
}

function getWeeksRemaining(timeline: Timeline): number | null {
  if (!timeline.startDate || timeline.phases.length === 0) return null;
  const lastPhase = [...timeline.phases].sort(
    (a, b) => b.orderIndex - a.orderIndex,
  )[0];
  if (!lastPhase?.endDate) return null;
  const end = new Date(lastPhase.endDate).getTime();
  const now = Date.now();
  if (now >= end) return 0;
  return Math.max(1, Math.round((end - now) / (7 * 24 * 60 * 60 * 1000)));
}

export function TimelineTeaser({ timelines, onSwitchTab }: TimelineTeaserProps) {
  const active = timelines.filter((t) => t.status === 'ACTIVE');
  if (active.length === 0) return null;

  const featured = active.find((t) => getActivePhase(t)) ?? active[0];
  const activePhase = getActivePhase(featured);
  const weeksRemaining = getWeeksRemaining(featured);
  const frameworkName =
    featured.template?.name ??
    featured.frameworkInstance?.framework.name ??
    'Unknown';

  const completedPhases = featured.phases.filter((p) => p.status === 'COMPLETED').length;
  const totalPhases = featured.phases.length;

  return (
    <button
      type="button"
      onClick={onSwitchTab}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{frameworkName}</span>
        <span className="text-muted-foreground">
          Phase {completedPhases + 1} of {totalPhases}
          {activePhase && ` - ${activePhase.name}`}
        </span>
        {weeksRemaining !== null && weeksRemaining > 0 && (
          <span className="text-muted-foreground">
            - {weeksRemaining}w remaining
          </span>
        )}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
        View Timeline
        <ArrowRight size={14} />
      </span>
    </button>
  );
}
