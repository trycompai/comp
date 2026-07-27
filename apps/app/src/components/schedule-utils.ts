import { TaskFrequency } from '@db';

/**
 * Approximate period length per cadence (months ≈ 30 days, quarter ≈ 91). The
 * server's `isDueToday` helper is the real scheduling authority; these values
 * back the "next run" UX hint shown on automation rows.
 */
export const PERIOD_DAYS: Record<TaskFrequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

/** The projected next run once an automation has a real last-run timestamp. */
export function nextRunAfter(frequency: TaskFrequency, lastRunAt: Date): Date {
  return new Date(lastRunAt.getTime() + PERIOD_DAYS[frequency] * 24 * 60 * 60 * 1000);
}

const MONTHS_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * "Jul 24" in UTC. Formatting in UTC (not local time) keeps the string
 * byte-identical on server vs. client and avoids off-by-one dates for users
 * in negative-UTC timezones — the same reason ScheduleSummary uses UTC.
 */
export function formatMonthDayUtc(d: Date): string {
  return `${MONTHS_ABBR[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
