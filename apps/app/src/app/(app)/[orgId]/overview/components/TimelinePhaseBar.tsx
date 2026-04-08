'use client';

import { Checkmark } from '@trycompai/design-system/icons';

interface Phase {
  id: string;
  name: string;
  groupLabel?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  durationWeeks: number;
  orderIndex: number;
  startDate?: string | null;
  endDate?: string | null;
}

interface TimelinePhaseBarProps {
  phases: Phase[];
  height?: number;
  showDates?: boolean;
}

function getProgressPercent(phase: Phase): number {
  if (!phase.startDate || !phase.endDate) return 50;
  const start = new Date(phase.startDate).getTime();
  const end = new Date(phase.endDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function formatShortDate(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface PhaseGroup {
  label: string | null;
  phases: Phase[];
  totalWeeks: number;
}

function buildPhaseGroups(sorted: Phase[]): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  let i = 0;

  while (i < sorted.length) {
    const label = sorted[i].groupLabel ?? null;
    const phases: Phase[] = [];

    while (i < sorted.length && (sorted[i].groupLabel ?? null) === label) {
      phases.push(sorted[i]);
      i++;
    }

    groups.push({
      label,
      phases,
      totalWeeks: phases.reduce((sum, p) => sum + p.durationWeeks, 0),
    });
  }

  return groups;
}

export function TimelinePhaseBar({
  phases,
  height = 36,
  showDates = false,
}: TimelinePhaseBarProps) {
  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);

  if (sorted.length === 0) return null;

  const hasDates = showDates && sorted.some((p) => p.startDate || p.endDate);
  const groups = buildPhaseGroups(sorted);
  const hasGroups = groups.some((g) => g.label);

  return (
    <div>
      {/* Group label row with bracket lines */}
      {hasGroups && (
        <div className="flex w-full gap-[3px] mb-0.5">
          {groups.map((group, idx) => (
            <div
              key={`group-${idx}`}
              className="flex flex-col items-center"
              style={{ flex: group.totalWeeks }}
            >
              {group.label ? (
                <>
                  <span className="truncate text-[10px] text-muted-foreground px-1">
                    {group.label}
                  </span>
                  <div className="flex w-full items-center mt-0.5">
                    <div className="h-[6px] w-px bg-muted-foreground/40" />
                    <div className="flex-1 h-px bg-muted-foreground/40" />
                    <div className="h-[6px] w-px bg-muted-foreground/40" />
                  </div>
                </>
              ) : (
                <div className="h-[18px]" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Phase bar — grouped phases are cohesive blocks */}
      <div className="flex w-full gap-[3px]" style={{ height }}>
        {groups.map((group, gIdx) => {
          const isFirstGroup = gIdx === 0;
          const isLastGroup = gIdx === groups.length - 1;

          if (group.phases.length === 1) {
            // Single phase — render directly with group-level rounding
            const phase = group.phases[0];
            const roundedL = isFirstGroup ? 'rounded-l-md' : '';
            const roundedR = isLastGroup ? 'rounded-r-md' : '';
            return (
              <PhaseSegment
                key={phase.id}
                phase={phase}
                className={`${roundedL} ${roundedR}`}
              />
            );
          }

          // Multi-phase group — render as cohesive block with no internal gaps
          const roundedL = isFirstGroup ? 'rounded-l-md' : '';
          const roundedR = isLastGroup ? 'rounded-r-md' : '';

          return (
            <div
              key={`group-bar-${gIdx}`}
              className={`flex overflow-hidden ${roundedL} ${roundedR}`}
              style={{ flex: group.totalWeeks }}
            >
              {group.phases.map((phase, pIdx) => (
                <PhaseSegment
                  key={phase.id}
                  phase={phase}
                  className={pIdx < group.phases.length - 1 ? 'border-r border-background/50' : ''}
                  inGroup
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Date markers */}
      {hasDates && (
        <div className="flex w-full gap-[3px] mt-1">
          {sorted.map((phase, index) => {
            const isLast = index === sorted.length - 1;
            return (
              <div
                key={`date-${phase.id}`}
                className="flex justify-between text-[10px] text-muted-foreground"
                style={{ flex: phase.durationWeeks }}
              >
                <span>{formatShortDate(phase.startDate)}</span>
                {isLast && <span>{formatShortDate(phase.endDate)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhaseSegment({
  phase,
  className = '',
  inGroup = false,
}: {
  phase: Phase;
  className?: string;
  inGroup?: boolean;
}) {
  if (phase.status === 'COMPLETED') {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-primary ${className}`}
        style={{ flex: phase.durationWeeks }}
      >
        <span className="truncate px-2 text-[11px] text-primary-foreground">
          {phase.name}
        </span>
        <Checkmark size={12} className="absolute right-1 top-1 text-primary-foreground/70" />
      </div>
    );
  }

  if (phase.status === 'IN_PROGRESS') {
    const progress = getProgressPercent(phase);
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-muted ${className}`}
        style={{ flex: phase.durationWeeks }}
      >
        <div className="absolute inset-y-0 left-0 bg-primary/50" style={{ width: `${progress}%` }} />
        <div className="absolute inset-y-0 w-[3px] bg-primary animate-pulse" style={{ left: `${progress}%` }} />
        <span className="relative z-10 truncate px-2 text-[11px] font-semibold text-foreground">
          {phase.name}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-muted ${className}`}
      style={{ flex: phase.durationWeeks }}
    >
      <span className="truncate px-2 text-[11px] text-muted-foreground">
        {phase.name}
      </span>
    </div>
  );
}

export type { Phase, TimelinePhaseBarProps };
