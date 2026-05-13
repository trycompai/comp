'use client';

import { differenceInDays, format } from 'date-fns';
import { Text } from '@trycompai/design-system';

interface OffboardingSummaryCardProps {
  offboardDate: string;
  totalItems: number;
  completedItems: number;
}

export function OffboardingSummaryCard({
  offboardDate,
  totalItems,
  completedItems,
}: OffboardingSummaryCardProps) {
  const daysSince = differenceInDays(new Date(), new Date(offboardDate));
  const progressPercent =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-6 rounded-lg border p-5">
      <div>
        <div className="mb-1">
          <Text size="xs" variant="muted" weight="medium">
            OFFBOARDING PROGRESS
          </Text>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{completedItems}</span>
          <span className="text-sm text-muted-foreground">
            / {totalItems} tasks
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1">
          <Text size="xs" variant="muted" weight="medium">
            TERMINATION DATE
          </Text>
        </div>
        <p className="mt-1 text-lg font-semibold font-mono">
          {format(new Date(offboardDate), 'MMM d, yyyy')}
        </p>
      </div>
      <div>
        <div className="mb-1">
          <Text size="xs" variant="muted" weight="medium">
            DAYS SINCE
          </Text>
        </div>
        <p className="mt-1 text-2xl font-bold font-mono">{daysSince}</p>
      </div>
    </div>
  );
}
