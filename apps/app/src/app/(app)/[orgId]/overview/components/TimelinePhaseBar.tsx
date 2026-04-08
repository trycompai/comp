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

function getRoundedClass(index: number, total: number) {
  if (total === 1) return 'rounded-md';
  if (index === 0) return 'rounded-l-md';
  if (index === total - 1) return 'rounded-r-md';
  return '';
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
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface GroupSpan {
  label: string | null;
  totalWeeks: number;
}

function buildGroupSpans(sorted: Phase[]): GroupSpan[] {
  const spans: GroupSpan[] = [];
  let i = 0;

  while (i < sorted.length) {
    const label = sorted[i].groupLabel ?? null;
    let totalWeeks = 0;

    while (i < sorted.length && (sorted[i].groupLabel ?? null) === label) {
      totalWeeks += sorted[i].durationWeeks;
      i++;
    }

    spans.push({ label, totalWeeks });
  }

  return spans;
}

export function TimelinePhaseBar({
  phases,
  height = 36,
  showDates = false,
}: TimelinePhaseBarProps) {
  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);

  if (sorted.length === 0) return null;

  const hasDates = showDates && sorted.some((p) => p.startDate || p.endDate);
  const hasGroups = sorted.some((p) => p.groupLabel);

  // Build group spans for the label row
  const groupSpans = hasGroups ? buildGroupSpans(sorted) : [];

  return (
    <div>
      {/* Group label row above the bar with bracket lines */}
      {hasGroups && (
        <div className="flex w-full gap-[3px] mb-0.5">
          {groupSpans.map((span, idx) => (
            <div
              key={`group-${idx}`}
              className="flex flex-col items-center"
              style={{ flex: span.totalWeeks }}
            >
              {span.label ? (
                <>
                  <span className="truncate text-[10px] text-muted-foreground px-1">
                    {span.label}
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

      <div className="flex w-full gap-[3px]" style={{ height }}>
        {sorted.map((phase, index) => {
          const rounded = getRoundedClass(index, sorted.length);

          if (phase.status === 'COMPLETED') {
            return (
              <div
                key={phase.id}
                className={`relative flex items-center justify-center overflow-hidden bg-primary ${rounded}`}
                style={{ flex: phase.durationWeeks }}
              >
                <span className="truncate px-2 text-[11px] text-primary-foreground">
                  {phase.name}
                </span>
                <Checkmark
                  size={12}
                  className="absolute right-1 top-1 text-primary-foreground/70"
                />
              </div>
            );
          }

          if (phase.status === 'IN_PROGRESS') {
            const progress = getProgressPercent(phase);
            return (
              <div
                key={phase.id}
                className={`relative flex items-center justify-center overflow-hidden bg-muted ${rounded}`}
                style={{ flex: phase.durationWeeks }}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-primary/50"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute inset-y-0 w-[3px] bg-primary animate-pulse"
                  style={{ left: `${progress}%` }}
                />
                <span className="relative z-10 truncate px-2 text-[11px] font-semibold text-foreground">
                  {phase.name}
                </span>
              </div>
            );
          }

          return (
            <div
              key={phase.id}
              className={`relative flex items-center justify-center overflow-hidden bg-muted ${rounded}`}
              style={{ flex: phase.durationWeeks }}
            >
              <span className="truncate px-2 text-[11px] text-muted-foreground">
                {phase.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Date markers below the bar */}
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

export type { Phase, TimelinePhaseBarProps };
