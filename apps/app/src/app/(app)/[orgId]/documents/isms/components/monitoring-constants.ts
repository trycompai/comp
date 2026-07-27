import type { IsmsMetric, IsmsMetricCadence } from '../isms-types';
import {
  anchorPeriod,
  isMetricOverdue,
  listMissingPeriods,
  periodLabel,
  periodStartFor,
  toPeriodKey,
} from './monitoring-periods';

export const METRIC_CADENCES = ['monthly', 'quarterly'] as const;

export const METRIC_CADENCE_LABELS: Record<IsmsMetricCadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

/**
 * Clause-9.1 completeness check, mirroring the server gate in
 * apps/api/src/isms/documents/monitoring.ts (metricValidationMessages) so the
 * Submit button disables for exactly the reasons the API would reject.
 */
export function metricValidationMessages({
  metrics,
}: {
  metrics: Array<Pick<IsmsMetric, 'name' | 'cadence' | 'isActive'>>;
}): string[] {
  const active = metrics.filter((metric) => metric.isActive);
  if (active.length === 0) {
    return ['At least one metric must be active.'];
  }
  return active
    .filter((metric) => !metric.cadence)
    .map((metric) => `"${metric.name}" needs a cadence.`);
}

/** The period keys of a metric's existing measurements. */
export function measuredKeys(metric: IsmsMetric): Set<string> {
  const keys = new Set<string>();
  for (const measurement of metric.measurements) {
    const key = toPeriodKey(measurement.periodStart);
    if (key) keys.add(key);
  }
  return keys;
}

/** True when the metric's most recent period is older than the cadence allows. */
export function metricIsOverdue(metric: IsmsMetric, now: Date): boolean {
  if (!metric.isActive || !metric.cadence) return false;
  const measured = measuredKeys(metric);
  const latest = [...measured].sort().pop() ?? null;
  return isMetricOverdue({
    cadence: metric.cadence,
    latestMeasured: latest,
    anchor: anchorPeriod({
      cadence: metric.cadence,
      createdAt: metric.createdAt,
      measuredKeys: measured,
    }),
    now,
  });
}

/** One row of the "Metrics due" / backfill bulk-entry view: metric × period. */
export interface DueEntry {
  metric: IsmsMetric;
  periodKey: string;
  periodText: string;
  /** The current (in-progress) period is "due"; earlier ones are overdue gaps. */
  isCurrentPeriod: boolean;
  /** The metric's most recent recorded value, for "Same as last period". */
  lastValue: string | null;
}

/**
 * Every unmeasured period across the given metrics (active, with a cadence),
 * current first then older gaps — the union view the ticket calls "Metrics
 * due" and "cross-metric backfill". Pass one metric for per-metric backfill.
 */
export function computeDueEntries({
  metrics,
  now,
}: {
  metrics: IsmsMetric[];
  now: Date;
}): DueEntry[] {
  const entries: DueEntry[] = [];
  for (const metric of metrics) {
    if (!metric.isActive || !metric.cadence) continue;
    const cadence = metric.cadence;
    const measured = measuredKeys(metric);
    const missing = listMissingPeriods({
      cadence,
      anchor: anchorPeriod({
        cadence,
        createdAt: metric.createdAt,
        measuredKeys: measured,
      }),
      measured,
      now,
    });
    // measurements arrive newest first (periodStart desc, recordedAt desc).
    const lastValue = metric.measurements[0]?.value ?? null;
    const currentPeriod = periodStartFor(cadence, now);
    for (const periodKey of missing) {
      entries.push({
        metric,
        periodKey,
        periodText: periodLabel(cadence, periodKey),
        isCurrentPeriod: periodKey === currentPeriod,
        lastValue,
      });
    }
  }
  return entries;
}
