'use client';

import { differenceInDays, format } from 'date-fns';

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
    <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-6 rounded-lg border p-5">
      <div>
        <div className="mb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Offboarding progress
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-normal tabular-nums">
            {completedItems}
          </span>
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
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Termination date
          </span>
        </div>
        <p className="mt-1 font-mono text-lg font-normal">
          {format(new Date(offboardDate), 'MMM d, yyyy')}
        </p>
      </div>
      <div>
        <div className="mb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Days since
          </span>
        </div>
        <p className="mt-1 font-mono text-2xl font-normal text-primary tabular-nums">
          {daysSince}
        </p>
      </div>
      <div>
        <div className="mb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Completion
          </span>
        </div>
        <p className="mt-1 font-mono text-2xl font-normal tabular-nums">
          {progressPercent}%
        </p>
      </div>
    </div>
  );
}
