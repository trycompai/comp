'use client';

import { TaskFrequency } from '@db';

const LABELS: Record<TaskFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const PERIOD_DAYS: Record<TaskFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

// Approximate next-run (months ≈ 30 days). The server's isDueToday helper is the
// real authority; this is only a UX hint shown on automation cards.
function computeNextRun(frequency: TaskFrequency, lastRunAt: Date | null): Date {
  const base = lastRunAt ?? new Date();
  return new Date(base.getTime() + PERIOD_DAYS[frequency] * 24 * 60 * 60 * 1000);
}

export function ScheduleSummary({
  scheduleFrequency,
  lastRunAt,
}: {
  scheduleFrequency: TaskFrequency;
  lastRunAt: string | Date | null;
}) {
  const last = lastRunAt ? new Date(lastRunAt) : null;
  const next = computeNextRun(scheduleFrequency, last);
  return (
    <span className="text-xs text-muted-foreground">
      Runs {LABELS[scheduleFrequency]} · next: {next.toLocaleDateString()}
    </span>
  );
}
