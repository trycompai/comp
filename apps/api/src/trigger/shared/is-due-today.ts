import { TaskFrequency } from '@trycompai/db';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function calendarMonthsBetween(earlier: Date, later: Date): number {
  const years = later.getUTCFullYear() - earlier.getUTCFullYear();
  const months = later.getUTCMonth() - earlier.getUTCMonth();
  return years * 12 + months;
}

/**
 * Returns whether an automation with the given schedule is due to run at `now`.
 *
 * `now` and `lastRunAt` are treated as UTC instants — weekly math uses fixed
 * 86_400_000-ms days, monthly/quarterly/yearly use UTC calendar buckets. Callers
 * should pass real `Date` values (any instant works); do NOT pass "midnight in
 * local time" expecting DST-aware behavior.
 *
 * `null` lastRunAt always returns `true` (first run).
 */
export function isDueToday({
  scheduleFrequency,
  lastRunAt,
  now,
}: {
  scheduleFrequency: TaskFrequency;
  lastRunAt: Date | null;
  now: Date;
}): boolean {
  if (scheduleFrequency === TaskFrequency.daily) return true;
  if (lastRunAt === null) return true;

  switch (scheduleFrequency) {
    case TaskFrequency.weekly: {
      const days = Math.floor((now.getTime() - lastRunAt.getTime()) / MS_PER_DAY);
      return days >= 7;
    }
    case TaskFrequency.monthly:
      return calendarMonthsBetween(lastRunAt, now) >= 1;
    case TaskFrequency.quarterly:
      return calendarMonthsBetween(lastRunAt, now) >= 3;
    case TaskFrequency.yearly:
      return calendarMonthsBetween(lastRunAt, now) >= 12;
    default: {
      const _exhaustive: never = scheduleFrequency;
      throw new Error(`Unhandled TaskFrequency: ${String(_exhaustive)}`);
    }
  }
}
