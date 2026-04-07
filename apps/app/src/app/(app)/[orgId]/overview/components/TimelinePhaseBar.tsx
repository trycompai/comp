'use client';

import { Checkmark } from '@trycompai/design-system/icons';

interface Phase {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  durationWeeks: number;
  orderIndex: number;
}

interface TimelinePhaseBarProps {
  phases: Phase[];
  height?: number;
}

const statusStyles = {
  COMPLETED: {
    bg: 'bg-primary',
    text: 'text-primary-foreground',
  },
  IN_PROGRESS: {
    bg: 'bg-primary/60',
    text: 'text-primary-foreground font-semibold',
  },
  PENDING: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
} as const;

function getRoundedClass({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  if (total === 1) return 'rounded-md';
  if (index === 0) return 'rounded-l-md';
  if (index === total - 1) return 'rounded-r-md';
  return '';
}

export function TimelinePhaseBar({
  phases,
  height = 36,
}: TimelinePhaseBarProps) {
  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);

  if (sorted.length === 0) return null;

  return (
    <div className="flex w-full gap-[3px]" style={{ height }}>
      {sorted.map((phase, index) => {
        const styles = statusStyles[phase.status];
        const rounded = getRoundedClass({
          index,
          total: sorted.length,
        });

        return (
          <div
            key={phase.id}
            className={`relative flex items-center justify-center overflow-hidden ${styles.bg} ${rounded}`}
            style={{ flex: phase.durationWeeks }}
          >
            <span
              className={`truncate px-2 text-[11px] ${styles.text}`}
            >
              {phase.name}
            </span>
            {phase.status === 'COMPLETED' && (
              <Checkmark
                size={12}
                className="absolute right-1 top-1 text-primary-foreground"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { Phase, TimelinePhaseBarProps };
