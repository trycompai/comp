import type { BrowserEvidenceRunResult } from './browser-evidence-runner.service';

/** A normalized step to execute (real step row, or a legacy inline instruction). */
export type StepForRun = {
  id: string | null;
  order: number;
  profileId: string | null;
  targetUrl: string;
  instruction: string;
  evaluationCriteria: string | null;
};

/** Steps to run: the ordered step rows, or the inline instruction as one step. */
export function stepsForRun(automation: {
  targetUrl: string;
  instruction: string;
  evaluationCriteria: string | null;
  steps?: Array<{
    id: string;
    order: number;
    profileId: string | null;
    targetUrl: string;
    instruction: string;
    evaluationCriteria: string | null;
  }>;
}): StepForRun[] {
  if (automation.steps && automation.steps.length > 0) {
    return [...automation.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: step.id,
        order: step.order,
        profileId: step.profileId,
        targetUrl: step.targetUrl,
        instruction: step.instruction,
        evaluationCriteria: step.evaluationCriteria,
      }));
  }
  return [
    {
      id: null,
      order: 0,
      profileId: null,
      targetUrl: automation.targetUrl,
      instruction: automation.instruction,
      evaluationCriteria: automation.evaluationCriteria,
    },
  ];
}

export function profileMissingResult(): BrowserEvidenceRunResult {
  return {
    success: false,
    status: 'blocked',
    error: 'This step has no connected vendor login. Connect one, then run again.',
    needsReauth: true,
    failureCode: 'needs_reauth',
    failureStage: 'auth',
    blockedReason: 'No connection is bound to this step.',
    logs: [],
  };
}

export function profileBlockedResult(status: string): BrowserEvidenceRunResult {
  const needsUserAction = status === 'blocked';
  return {
    success: false,
    status: 'blocked',
    error: needsUserAction
      ? 'This browser profile is blocked. Resolve the blocked state before running automations.'
      : 'This browser profile is not verified. Reconnect it before running automations.',
    needsReauth: !needsUserAction,
    failureCode: needsUserAction ? 'needs_user_action' : 'needs_reauth',
    failureStage: 'auth',
    blockedReason: needsUserAction
      ? 'Browser profile is blocked.'
      : 'Browser profile is not verified.',
    logs: [],
  };
}

/**
 * Combine per-step results into one run verdict: overall success only if every
 * step ran; the check fails if any step's check fails; error metadata comes from
 * the first step that failed technically. A single step passes through verbatim.
 */
export function rollUpStepResults(
  results: BrowserEvidenceRunResult[],
): BrowserEvidenceRunResult {
  if (results.length === 1) return results[0];

  const firstProblem = results.find((result) => !result.success);
  const failedCheck = results.find(
    (result) => result.evaluationStatus === 'fail',
  );
  const lastWithShot = [...results]
    .reverse()
    .find((result) => result.screenshotKey);

  const status: BrowserEvidenceRunResult['status'] = results.every(
    (result) => result.success,
  )
    ? 'completed'
    : results.some((result) => result.status === 'failed')
      ? 'failed'
      : 'blocked';

  return {
    success: results.every((result) => result.success),
    status,
    screenshotKey: lastWithShot?.screenshotKey,
    screenshotUrl: lastWithShot?.screenshotUrl,
    finalUrl: results[results.length - 1]?.finalUrl,
    evaluationStatus: failedCheck
      ? 'fail'
      : results.some((result) => result.evaluationStatus === 'pass')
        ? 'pass'
        : undefined,
    evaluationReason: failedCheck?.evaluationReason,
    error: firstProblem?.error,
    needsReauth: results.some((result) => result.needsReauth),
    failureCode: firstProblem?.failureCode,
    failureStage: firstProblem?.failureStage,
    blockedReason: firstProblem?.blockedReason,
    logs: results.flatMap((result) =>
      Array.isArray(result.logs) ? result.logs : [],
    ),
  };
}
