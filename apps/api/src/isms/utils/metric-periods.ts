/**
 * Pure period math for the ISMS Monitoring register (clause 9.1, CS-723).
 *
 * A "period" is the calendar month (monthly cadence) or calendar quarter
 * (quarterly cadence) a measurement covers, identified by the period key —
 * the 'YYYY-MM-DD' of its first day in UTC. Keys sort chronologically as
 * plain strings.
 *
 * Kept dependency-free and MIRRORED in the app
 * (apps/app/.../documents/isms/components/monitoring-periods.ts) so the
 * "Metrics due" / backfill views and the server agree on due and overdue —
 * same precedent as roleValidationMessages (CS-698). Keep both copies in sync.
 */

export type MetricCadenceValue = 'monthly' | 'quarterly';

const PERIOD_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Months covered by one period of the cadence. */
function monthsPerPeriod(cadence: MetricCadenceValue): number {
  return cadence === 'monthly' ? 1 : 3;
}

function toUtcParts(key: string): { year: number; month: number } {
  return {
    year: Number(key.slice(0, 4)),
    month: Number(key.slice(5, 7)) - 1, // 0-based
  };
}

function keyFrom(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 1));
  return date.toISOString().slice(0, 10);
}

/** Normalize a Date or ISO string to a 'YYYY-MM-DD' key (UTC). Null if invalid. */
export function toPeriodKey(value: Date | string): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const head = value.slice(0, 10);
  if (!PERIOD_KEY_PATTERN.test(head)) return null;
  // Round-trip through Date so impossible dates (2026-02-30) are rejected.
  const date = new Date(`${head}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === head ? head : null;
}

/** The first day of the period containing `date`, for the given cadence. */
export function periodStartFor(
  cadence: MetricCadenceValue,
  date: Date,
): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const step = monthsPerPeriod(cadence);
  return keyFrom(year, month - (month % step));
}

/** Whether `value` is a valid, cadence-aligned period key (1st of month/quarter). */
export function isAlignedPeriodStart(
  cadence: MetricCadenceValue,
  value: string,
): boolean {
  const key = toPeriodKey(value);
  if (!key || key.slice(8, 10) !== '01') return false;
  const { month } = toUtcParts(key);
  return month % monthsPerPeriod(cadence) === 0;
}

/** Shift a period key by `count` periods (negative = earlier). */
export function addPeriods(
  cadence: MetricCadenceValue,
  periodKey: string,
  count: number,
): string {
  const { year, month } = toUtcParts(periodKey);
  return keyFrom(year, month + count * monthsPerPeriod(cadence));
}

/** Human label for a period key: "July 2026" (monthly) or "Q3 2026" (quarterly). */
export function periodLabel(
  cadence: MetricCadenceValue,
  periodKey: string,
): string {
  const { year, month } = toUtcParts(periodKey);
  if (cadence === 'quarterly') {
    return `Q${Math.floor(month / 3) + 1} ${year}`;
  }
  const name = new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
  return `${name} ${year}`;
}

/**
 * Every unmeasured period from the metric's anchor (the period it was created
 * in, or its earliest measurement if that is older) up to and INCLUDING the
 * current period. The current period counts as "due"; anything earlier is an
 * overdue gap. Newest first, capped at `cap` (oldest dropped) so a years-idle
 * metric cannot render an unbounded backfill table.
 */
export function listMissingPeriods({
  cadence,
  anchor,
  measured,
  now,
  cap = 60,
}: {
  cadence: MetricCadenceValue;
  /** Period key the metric's history starts at (see anchorPeriod). */
  anchor: string;
  /** Period keys that already have at least one measurement. */
  measured: ReadonlySet<string>;
  now: Date;
  cap?: number;
}): string[] {
  const current = periodStartFor(cadence, now);
  const missing: string[] = [];
  for (let key = current; key >= anchor; key = addPeriods(cadence, key, -1)) {
    if (!measured.has(key)) missing.push(key);
    if (missing.length >= cap) break;
  }
  return missing;
}

/** The period a metric's history starts at: creation, or its oldest measurement. */
export function anchorPeriod({
  cadence,
  createdAt,
  measuredKeys,
}: {
  cadence: MetricCadenceValue;
  createdAt: Date | string;
  measuredKeys: Iterable<string>;
}): string {
  const created = periodStartFor(
    cadence,
    createdAt instanceof Date ? createdAt : new Date(createdAt),
  );
  let earliest = created;
  for (const key of measuredKeys) {
    if (key < earliest) earliest = key;
  }
  return earliest;
}

/**
 * The overdue signal (visual only, per CS-723): a metric is overdue when its
 * MOST RECENT measurement's period is older than the cadence allows — i.e.
 * strictly older than the period before the current one. Recording the current
 * (or previous) period clears the state; earlier gaps stay visible in history
 * but do not keep the metric flagged.
 */
export function isMetricOverdue({
  cadence,
  latestMeasured,
  anchor,
  now,
}: {
  cadence: MetricCadenceValue;
  /** Period key of the most recent measurement, or null when none exist. */
  latestMeasured: string | null;
  /** anchorPeriod(...) — used when the metric has no measurements at all. */
  anchor: string;
  now: Date;
}): boolean {
  const current = periodStartFor(cadence, now);
  if (!latestMeasured) return anchor < current;
  return latestMeasured < addPeriods(cadence, current, -1);
}
