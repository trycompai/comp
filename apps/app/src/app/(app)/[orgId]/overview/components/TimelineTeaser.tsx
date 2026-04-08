'use client';

import { ArrowRight } from '@trycompai/design-system/icons';
import type { Timeline } from '@/hooks/use-timelines';
import { TimelinePhaseBar } from './TimelinePhaseBar';

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

function pickFeaturedTimeline(timelines: Timeline[]): Timeline | null {
  const active = timelines.filter((t) => t.status === 'ACTIVE');
  if (active.length === 0) return null;

  // Prefer the one closest to a milestone (has an IN_PROGRESS phase)
  const withActivePhase = active.find((t) => getActivePhase(t));
  return withActivePhase ?? active[0];
}

export function TimelineTeaser({ timelines, onSwitchTab }: TimelineTeaserProps) {
  const featured = pickFeaturedTimeline(timelines);
  if (!featured) return null;

  const activePhase = getActivePhase(featured);
  const weeksRemaining = getWeeksRemaining(featured);
  const frameworkName =
    featured.template?.name ??
    featured.frameworkInstance?.framework.name ??
    'Unknown Framework';

  return (
    <button
      type="button"
      onClick={onSwitchTab}
      className="w-full rounded-lg border border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="truncate font-medium text-primary">
                {frameworkName}
              </span>
              {activePhase && (
                <>
                  <span className="text-muted-foreground">&middot;</span>
                  <span className="truncate text-muted-foreground">
                    {activePhase.name}
                  </span>
                </>
              )}
              {weeksRemaining !== null && weeksRemaining > 0 && (
                <>
                  <span className="text-muted-foreground">&middot;</span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    {weeksRemaining} {weeksRemaining === 1 ? 'week' : 'weeks'} remaining
                  </span>
                </>
              )}
            </div>
            <div className="mt-1.5">
              <TimelinePhaseBar phases={featured.phases} height={6} />
            </div>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
          View Timeline
          <ArrowRight size={14} />
        </span>
      </div>
    </button>
  );
}
