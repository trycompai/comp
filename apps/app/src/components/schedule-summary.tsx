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
//
// When `lastRunAt` is null the orchestrator picks the automation up on its
// next tick, so we show "now" rather than now + period (which would over-
// project a full period into the future).
function computeNextRun(frequency: TaskFrequency, lastRunAt: Date | null, now: Date): Date {
  if (lastRunAt === null) return now;
  return new Date(lastRunAt.getTime() + PERIOD_DAYS[frequency] * 24 * 60 * 60 * 1000);
}

// Locale-agnostic YYYY-MM-DD so the rendered string is byte-identical on
// server vs. client, avoiding React hydration mismatches that
// `toLocaleDateString()` would introduce under different user locales.
function formatYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ScheduleSummary({
  scheduleFrequency,
  lastRunAt,
}: {
  scheduleFrequency: TaskFrequency;
  lastRunAt: string | Date | null;
}) {
  const last = lastRunAt ? new Date(lastRunAt) : null;
  // Anchor "now" to UTC midnight so a render that spans a day boundary
  // doesn't produce a different next-run date between server and client.
  const nowUtc = new Date();
  nowUtc.setUTCHours(0, 0, 0, 0);
  const next = computeNextRun(scheduleFrequency, last, nowUtc);
  // Before the first run the orchestrator picks the automation up on its very
  // next tick regardless of cadence (see server isDueToday: null lastRunAt is
  // always due), so the date is "today" for daily OR weekly. Label it "first
  // run" so a weekly automation showing today reads correctly; only after it
  // has run does the date become lastRun + period.
  const label = last === null ? 'first run' : 'next';
  return (
    <span className="text-xs text-muted-foreground">
      Runs {LABELS[scheduleFrequency]} · {label}: {formatYmdUtc(next)}
    </span>
  );
}
