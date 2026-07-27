import { logger, queue, task } from '@trigger.dev/sdk';
import { runBrowserAutomation } from './run-browser-automation';
import {
  sendBundledFailureEmails,
  type FailedTaskSummary,
} from '../integration-platform/run-org-integration-checks';

/** One automation scheduled for an org, as handed down by the orchestrator. */
export interface OrgBrowserAutomation {
  automationId: string;
  automationName: string;
  taskId: string;
}

// Bound how many per-org runners wait concurrently. The child automation runs
// are themselves globally capped by runBrowserAutomation's own queue, so only
// the PARENTS are bounded here (mirrors run-org-integration-checks).
const orgRunnerQueue = queue({
  name: 'browser-automations-org-runner',
  concurrencyLimit: 50,
});

// Chunk defensively — the orchestrator already caps automations per org, so in
// practice every org fits in a single batch.
const CHILD_BATCH_SIZE = 100;

/** The subset of a browser-automation run's output the collector reads. All
 *  optional so a not-found / disabled / errored run (which omits taskId) is
 *  handled without a cast. */
interface BrowserRunOutput {
  success?: boolean;
  taskId?: string;
  taskTitle?: string;
  statusChangedToFailed?: boolean;
  evaluationStatus?: 'pass' | 'fail';
  needsReauth?: boolean;
}

/**
 * Reduce a batchTriggerAndWait over runBrowserAutomation to the tasks that
 * freshly transitioned into `failed`, one entry per task. A task can own several
 * automations (Task.browserAutomations is 1-to-many) and they run concurrently,
 * so results are aggregated by taskId: `totalCount` = automations that ran for
 * the task this batch, `failedCount` = how many did not pass. Only tasks this
 * batch actually flipped to `failed` (statusChangedToFailed) are reported —
 * matching the integration behavior (an already-failed task isn't re-notified,
 * and an infra-only failure that didn't flip the task is skipped). Pure +
 * exported for unit testing.
 */
export function collectFailedBrowserTasks(
  runs: Array<{ ok: boolean; output?: BrowserRunOutput }>,
): FailedTaskSummary[] {
  const byTask = new Map<
    string,
    {
      taskTitle: string;
      failedCount: number;
      totalCount: number;
      transitioned: boolean;
    }
  >();

  for (const run of runs) {
    if (!run.ok || !run.output) continue;
    const o = run.output;
    // Not-found / disabled runs carry no taskId — nothing to report.
    if (typeof o.taskId !== 'string') continue;

    const entry = byTask.get(o.taskId) ?? {
      taskTitle: o.taskTitle ?? o.taskId,
      failedCount: 0,
      totalCount: 0,
      transitioned: false,
    };
    entry.totalCount += 1;
    const didNotPass =
      o.success !== true ||
      o.evaluationStatus === 'fail' ||
      o.needsReauth === true;
    if (didNotPass) entry.failedCount += 1;
    if (o.statusChangedToFailed === true) entry.transitioned = true;
    byTask.set(o.taskId, entry);
  }

  const failed: FailedTaskSummary[] = [];
  for (const [taskId, e] of byTask) {
    if (!e.transitioned) continue;
    failed.push({
      taskId,
      taskTitle: e.taskTitle,
      // A transitioned task failed at least once; keep the tally honest and >=1.
      failedCount: Math.max(1, e.failedCount),
      totalCount: Math.max(e.totalCount, e.failedCount, 1),
    });
  }
  return failed;
}

/**
 * Per-org runner. The daily orchestrator dispatches ONE of these per org
 * (fire-and-forget). It runs that org's due browser automations in parallel via
 * batchTriggerAndWait, then sends a SINGLE bundled email listing every task that
 * failed this run — reusing the exact integration failure-email path
 * (sendBundledFailureEmails) so both products notify identically. Mirrors
 * run-org-integration-checks.
 */
export const runOrgBrowserAutomations = task({
  id: 'run-org-browser-automations',
  queue: orgRunnerQueue,
  // maxDuration is max COMPUTE time in SECONDS; the suspended wait during
  // batchTriggerAndWait is checkpointed and doesn't count against it. 1h matches
  // the sibling integration runner.
  maxDuration: 60 * 60,
  run: async (payload: {
    organizationId: string;
    organizationName: string;
    automations: OrgBrowserAutomation[];
  }) => {
    const { organizationId, organizationName, automations } = payload;

    logger.info(
      `Running browser automations for org ${organizationId} (${automations.length} automation(s))`,
    );

    if (automations.length === 0) {
      return {
        organizationId,
        automationsRun: 0,
        failedTasks: 0,
        emailed: false,
      };
    }

    const allRuns: Array<{ ok: boolean; output?: BrowserRunOutput }> = [];
    for (let i = 0; i < automations.length; i += CHILD_BATCH_SIZE) {
      const batch = automations.slice(i, i + CHILD_BATCH_SIZE);
      const batchResult = await runBrowserAutomation.batchTriggerAndWait(
        batch.map((a) => ({
          payload: {
            automationId: a.automationId,
            automationName: a.automationName,
            organizationId,
            taskId: a.taskId,
          },
        })),
      );
      for (const r of batchResult.runs) {
        allRuns.push(r.ok ? { ok: true, output: r.output } : { ok: false });
      }
    }

    const failedTasks = collectFailedBrowserTasks(allRuns);

    logger.info(
      `Org ${organizationId}: ${failedTasks.length} task(s) transitioned to failed`,
    );

    await sendBundledFailureEmails({
      organizationId,
      organizationName,
      failedTasks,
    });

    return {
      organizationId,
      automationsRun: automations.length,
      failedTasks: failedTasks.length,
      emailed: failedTasks.length > 0,
    };
  },
});
