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
  return failing.filter((f) => !exceptions.has(f.connectionId, f.checkId, f.resourceId)).length;
}

/**
 * Decide a task's status from its check results. Canonical rule, shared by the
 * manual and scheduled paths:
 *   - any real (non-excepted) failure → failed
 *   - else if the check evaluated any resource (a passing result OR a finding,
 *     including the case where every finding is excepted) → done
 *   - else leave unchanged (nothing was evaluated, e.g. an all-errored run).
 *
 * For DYNAMIC integrations, EVERY failure is held as 'inconclusive' (pending) and
 * counted in `heldCount`, never in `effectiveFailures` — so a held check never
 * fails the task (the self-heal agent is the only decider of our-bug vs real
 * fail). When the agent reveals a genuine fail, that run persists 'failed' and a
 * later evaluation fails the task; when it fixes, the run passes and the task goes
 * done. heldCount is always 0 for non-dynamic (static/AWS/GCP/Azure).
 */
export function decideTaskStatus(
  effectiveFailures: number,
  totalPassing: number,
  totalFindings: number,
  heldCount = 0,
): 'failed' | 'done' | null {
  if (effectiveFailures > 0) return 'failed';
  // Any held (pending) check is UNRESOLVED — never declare the task done while one
  // is pending; that would hide an unresolved failure behind a green task.
  if (heldCount > 0) return null;
  if (totalPassing > 0 || totalFindings > 0) return 'done';
  return null;
}

/**
 * Decide the per-run status stored on an IntegrationCheckRun. Shared by ALL run
 * paths (scheduled, manual, agent re-run). comp does NO classification: for a
 * DYNAMIC integration every non-success — a finding, a customer/transport error,
 * or a thrown execution error — is held as 'inconclusive' ("pending", hidden from
 * the customer) and handed to the self-heal agent, the ONLY decider of our-bug vs
 * real fail. Static/AWS/GCP/Azure (isDynamic = false) keep the plain mapping.
 */
export function decideRunStatus(params: {
  resultStatus: string;
  isDynamic: boolean;
}): 'success' | 'failed' | 'inconclusive' {
  const { resultStatus, isDynamic } = params;
  if (resultStatus === 'success') return 'success';
  return isDynamic ? 'inconclusive' : 'failed';
}
