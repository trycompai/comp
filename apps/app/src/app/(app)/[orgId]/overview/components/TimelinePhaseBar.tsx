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
    bg: 'bg-green-800',
    text: 'text-green-200',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-700',
    text: 'text-blue-200 font-semibold',
  },
  PENDING: {
    bg: 'bg-zinc-900',
    text: 'text-zinc-600',
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
                className="absolute right-1 top-1 text-green-200"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { Phase, TimelinePhaseBarProps };
