import { ActiveExceptionSet } from '../../cloud-security/finding-exceptions';
import { classifyCheckFailure } from '../services/check-failure-classifier';
import { redactSecrets } from './redact-secrets';

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
 * manual and scheduled paths:
 *   - any real (non-excepted) failure → failed
 *   - else if the check evaluated any resource (a passing result OR a finding,
 *     including the case where every finding is excepted) → done
 *   - else leave unchanged (nothing was evaluated, e.g. an all-errored run —
 *     indeterminate, not a violation; it retries next tick)
 *
 * `effectiveFailures` is the non-excepted failure count from
 * {@link countEffectiveFailures}; `totalFindings` is the RAW finding count so an
 * all-excepted run (effectiveFailures 0, no passing results) still transitions
 * to done instead of getting stuck in its prior status.
 */
export function decideTaskStatus(
  effectiveFailures: number,
  totalPassing: number,
  totalFindings: number,
): 'failed' | 'done' | null {
  if (effectiveFailures > 0) return 'failed';
  if (totalPassing > 0 || totalFindings > 0) return 'done';
  return null;
}

/** A failing finding plus the signals needed to classify WHY it failed. */
export interface ClassifiableFailure extends FailingFinding {
  /** HTTP status the failure carried, if any. */
  httpStatus?: number | null;
  /** Error text from the finding's evidence. MUST be pre-redacted of secrets. */
  errorText?: string | null;
  /** True if the runtime threw rather than the vendor returning an error. */
  threw?: boolean;
}

export interface FailureDisposition {
  /** Genuine failures — fail the task + show (compliance findings + proven customer-side). */
  effective: ClassifiableFailure[];
  /** Held failures — our-side bug / transient. Task NOT failed; surfaced as inconclusive. */
  held: ClassifiableFailure[];
}

/**
 * Split failing findings into those that should fail the task (real compliance
 * findings + proven customer-side issues) vs those to HOLD as inconclusive
 * (our-side bug / transient), so a customer never sees a red for our problem.
 *
 * For DYNAMIC integrations only — the caller gates this; static/AWS checks keep
 * their existing behavior. The classifier is conservative (never blames the
 * customer without proof), so ambiguous failures are held, not shown.
 *
 * `fleet` (optional) is the same check's pass/fail counts across the provider's
 * other active connections — a fleet-wide failure is held even if it looks
 * customer-like.
 */
export function splitFailuresByDisposition(
  failing: ClassifiableFailure[],
  fleet?: { passing: number; failing: number } | null,
): FailureDisposition {
  const effective: ClassifiableFailure[] = [];
  const held: ClassifiableFailure[] = [];
  for (const f of failing) {
    const { class: cls } = classifyCheckFailure({
      httpStatus: f.httpStatus,
      errorText: f.errorText,
      threw: f.threw,
      fleet,
    });
    if (cls === 'our_side' || cls === 'transient') {
      held.push(f);
    } else {
      // 'compliance' + 'customer_side' → show the customer.
      effective.push(f);
    }
  }
  return { effective, held };
}

/**
 * Decide the per-run status stored on an IntegrationCheckRun. Canonical rule,
 * shared by ALL run paths (scheduled, manual, and the agent re-run) so a held
 * run is classified identically everywhere:
 *   - base: an execution 'error' → 'failed'; otherwise the raw success/failed.
 *   - DYNAMIC only: an execution error, or a run whose failures are ALL held
 *     (our-side/transient → no effective failures), becomes 'inconclusive' —
 *     the self-heal queue, hidden from the customer. Static/AWS keep the base.
 *
 * `failures` carries the per-finding signals (from {@link failureSignalsFromEvidence}).
 */
export function decideRunStatus(params: {
  resultStatus: string;
  failures: ClassifiableFailure[];
  isDynamic: boolean;
  fleet?: { passing: number; failing: number } | null;
}): 'success' | 'failed' | 'inconclusive' {
  const { resultStatus, failures, isDynamic, fleet } = params;
  let runStatus: 'success' | 'failed' | 'inconclusive' =
    resultStatus === 'success' ? 'success' : 'failed';
  if (isDynamic) {
    if (resultStatus === 'error') {
      runStatus = 'inconclusive';
    } else if (
      failures.length > 0 &&
      splitFailuresByDisposition(failures, fleet).effective.length === 0
    ) {
      runStatus = 'inconclusive';
    }
  }
  return runStatus;
}

/**
 * Extract classification signals from a failing finding's evidence. `errorText`
 * is REDACTED of secrets/PII before it leaves this function.
 *
 * Defensive about the heterogeneous evidence shapes checks emit: if no signal is
 * found, returns empty signals → the failure is treated as a genuine compliance
 * finding (today's behavior), so a check is never wrongly held. `resultStatus`
 * of 'error' means the check threw → an execution failure.
 */
export function failureSignalsFromEvidence(
  evidence: Record<string, unknown> | null | undefined,
  resultStatus?: string,
): { httpStatus: number | null; errorText: string | null; threw: boolean } {
  const ev = evidence ?? {};
  const errStr = typeof ev.error === 'string' ? ev.error : null;
  const msgStr = typeof ev.message === 'string' ? ev.message : null;

  let httpStatus: number | null = null;
  // e.g. evidence.error === 'http_404'
  if (errStr) {
    const m = errStr.match(/http[_-]?(\d{3})/i);
    if (m) httpStatus = Number(m[1]);
  }
  // e.g. evidence.status === 404
  if (httpStatus == null && typeof ev.status === 'number') {
    httpStatus = ev.status;
  }

  const rawText = msgStr ?? errStr ?? '';
  const errorText = rawText ? redactSecrets(rawText) : null;
  const threw = resultStatus === 'error';

  return { httpStatus, errorText, threw };
}
