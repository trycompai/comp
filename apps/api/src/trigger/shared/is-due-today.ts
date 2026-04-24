import { TaskFrequency } from '@trycompai/db';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function calendarMonthsBetween(earlier: Date, later: Date): number {
  const years = later.getUTCFullYear() - earlier.getUTCFullYear();
  const months = later.getUTCMonth() - earlier.getUTCMonth();
  return years * 12 + months;
}

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
      return _exhaustive;
    }
  }
}
