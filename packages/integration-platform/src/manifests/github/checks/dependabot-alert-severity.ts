/**
 * Severity helpers for the Dependabot check.
 * Kept in a separate module so the main check file stays focused and the
 * helpers can be unit-tested independently of the NestJS/GitHub fetch layer.
 */

import type { FindingSeverity } from '../../../types';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AlertCounts {
  open: number;
  dismissed: number;
  fixed: number;
  total: number;
  bySeverity: Record<AlertSeverity, number>;
}

export const VALID_ALERT_SEVERITIES: ReadonlySet<AlertSeverity> = new Set([
  'critical',
  'high',
  'medium',
  'low',
]);

export const DEFAULT_ALERT_SEVERITY_THRESHOLD: AlertSeverity = 'high';

/**
 * Normalize an arbitrary string into a valid AlertSeverity, falling back to
 * the default threshold when the value is missing or unknown.
 */
export const resolveSeverityThreshold = (raw: string | undefined): AlertSeverity =>
  raw && VALID_ALERT_SEVERITIES.has(raw as AlertSeverity)
    ? (raw as AlertSeverity)
    : DEFAULT_ALERT_SEVERITY_THRESHOLD;

/**
 * Count open alerts at or above the configured severity threshold.
 * e.g. threshold='high' counts critical + high.
 */
export const countAtOrAboveSeverity = (
  bySeverity: Record<AlertSeverity, number>,
  threshold: AlertSeverity,
): number => {
  switch (threshold) {
    case 'critical':
      return bySeverity.critical;
    case 'high':
      return bySeverity.critical + bySeverity.high;
    case 'medium':
      return bySeverity.critical + bySeverity.high + bySeverity.medium;
    case 'low':
    default:
      return bySeverity.critical + bySeverity.high + bySeverity.medium + bySeverity.low;
  }
};

/**
 * Highest actual severity present in the counts, used to set the severity of
 * the emitted ctx.fail finding.
 */
export const highestPresentSeverity = (
  bySeverity: Record<AlertSeverity, number>,
): FindingSeverity => {
  if (bySeverity.critical > 0) return 'critical';
  if (bySeverity.high > 0) return 'high';
  if (bySeverity.medium > 0) return 'medium';
  return 'low';
};

export const thresholdLabel = (threshold: AlertSeverity): string =>
  threshold === 'low' ? 'any severity' : `${threshold} severity or above`;
