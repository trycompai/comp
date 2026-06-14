import { ActiveExceptionSet } from '../../cloud-security/finding-exceptions';

/** A failing finding, identified the same way an exception is keyed. */
export interface FailingFinding {
  connectionId: string;
  checkId: string;
  resourceId: string;
}

/**
 * Count failing findings that are NOT under an active exception. Shared by the
 * manual run-check and the scheduled Trigger task so both decide task status
 * identically — an explicitly-excepted finding must not fail the task in either.
 */
export function countEffectiveFailures(
  failing: FailingFinding[],
  exceptions: ActiveExceptionSet,
): number {
  if (exceptions.size === 0) return failing.length;
  return failing.filter(
    (f) => !exceptions.has(f.connectionId, f.checkId, f.resourceId),
  ).length;
}

/**
 * Decide a task's status from its check results. Canonical rule, shared by the
 * manual and scheduled paths: any real (non-excepted) failure → failed; else any
 * passing result → done; else leave unchanged (e.g. an all-errored run, which is
 * indeterminate, not a violation). `effectiveFailures` is the non-excepted
 * failure count from {@link countEffectiveFailures}.
 */
export function decideTaskStatus(
  effectiveFailures: number,
  totalPassing: number,
): 'failed' | 'done' | null {
  if (effectiveFailures > 0) return 'failed';
  if (totalPassing > 0) return 'done';
  return null;
}
