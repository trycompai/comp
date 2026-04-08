'use client';


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

    if (label) {
      // Named group — collect consecutive phases with same label
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
    } else {
      // No group — each phase is its own group
      const phase = sorted[i];
      groups.push({
        label: null,
        phases: [phase],
        totalWeeks: phase.durationWeeks,
      });
      i++;
    }
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
      {/* Group label row with bracket lines — hidden on mobile */}
      {hasGroups && (
        <div className="hidden lg:flex w-full gap-[3px] mb-0.5">
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

      {/* Phase bar — Desktop: horizontal. Mobile: vertical stack */}

      {/* Desktop version */}
      <div className="hidden lg:flex w-full gap-[3px]" style={{ height }}>
        {groups.map((group, gIdx) => {
          const isFirstGroup = gIdx === 0;
          const isLastGroup = gIdx === groups.length - 1;

          if (group.phases.length === 1) {
            const phase = group.phases[0];
            const rounded = `${isFirstGroup ? 'rounded-l-md' : ''} ${isLastGroup ? 'rounded-r-md' : ''}`;
            return <PhaseSegment key={phase.id} phase={phase} className={rounded} />;
          }

          return (
            <div
              key={`group-bar-${gIdx}`}
              className={`flex overflow-hidden ${isFirstGroup ? 'rounded-l-md' : ''} ${isLastGroup ? 'rounded-r-md' : ''}`}
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

      {/* Mobile version — compact bars, one row per group, no per-phase dates */}
      <div className="flex flex-col gap-[3px] lg:hidden">
        {groups.map((group, gIdx) => {
          if (group.phases.length === 1) {
            return (
              <PhaseSegment
                key={`m-${group.phases[0].id}`}
                phase={group.phases[0]}
                className="rounded-md"
                style={{ height: 28 }}
              />
            );
          }

          return (
            <div key={`m-group-${gIdx}`} className="flex overflow-hidden rounded-md" style={{ height: 28 }}>
              {group.phases.map((phase, pIdx) => (
                <PhaseSegment
                  key={`m-${phase.id}`}
                  phase={phase}
                  className={pIdx < group.phases.length - 1 ? 'border-r border-background/50' : ''}
                  inGroup
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Date markers — hidden on mobile */}
      {hasDates && (
        <div className="hidden lg:flex w-full gap-[3px] mt-1">
          {groups.map((group, gIdx) => {
            const first = group.phases[0];
            const last = group.phases[group.phases.length - 1];
            const isLastGroup = gIdx === groups.length - 1;
            return (
              <div
                key={`date-group-${gIdx}`}
                className="flex justify-between text-[10px] text-muted-foreground"
                style={{ flex: group.totalWeeks }}
              >
                <span>{formatShortDate(first.startDate)}</span>
                {isLastGroup && <span>{formatShortDate(last.endDate)}</span>}
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
  style,
}: {
  phase: Phase;
  className?: string;
  inGroup?: boolean;
  style?: React.CSSProperties;
}) {
  const flexStyle = style ?? { flex: phase.durationWeeks };

  if (phase.status === 'COMPLETED') {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-primary ${className}`}
        style={flexStyle}
      >
        <span className="truncate px-2 text-[11px] text-primary-foreground">
          {phase.name}
        </span>

      </div>
    );
  }

  if (phase.status === 'IN_PROGRESS') {
    const progress = getProgressPercent(phase);
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{
          ...flexStyle,
          background: `repeating-linear-gradient(
            -45deg,
            var(--muted),
            var(--muted) 4px,
            color-mix(in oklch, var(--primary) 10%, transparent) 4px,
            color-mix(in oklch, var(--primary) 10%, transparent) 8px
          )`,
        }}
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
      style={flexStyle}
    >
      <span className="truncate px-2 text-[11px] text-muted-foreground">
        {phase.name}
      </span>
    </div>
  );
}

export type { Phase, TimelinePhaseBarProps };
