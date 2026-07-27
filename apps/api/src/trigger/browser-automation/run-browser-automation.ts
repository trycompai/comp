import { db } from '@db';
import { logger, tags, task } from '@trigger.dev/sdk';
import { BrowserbaseService } from '../../browserbase/browserbase.service';

const browserbaseService = new BrowserbaseService();

const browserAutomationConcurrencyLimit = (): number => {
  const parsed = Number.parseInt(
    process.env.BROWSER_AUTOMATION_GLOBAL_CONCURRENCY ?? '20',
    10,
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
};

export function shouldMarkTaskDoneAfterBrowserRun(input: {
  screenshotUrl?: string;
  evaluationCriteria?: string | null;
  evaluationStatus?: 'pass' | 'fail';
}): boolean {
  if (!input.screenshotUrl) return false;
  const criteria = input.evaluationCriteria?.trim();
  if (!criteria) return true;
  return input.evaluationStatus === 'pass';
}

/**
 * Whether a non-passing run means the task is genuinely no longer satisfied, so
 * we should flip it to `failed`. A `fail` verdict = the control regressed;
 * `needsReauth` = we can no longer sign in. An infra-only failure (timeout,
 * model unavailable, …) has neither — that's "couldn't verify", not "control
 * failed", so we leave the task alone and let it retry on the next tick.
 */
export function shouldMarkTaskFailedAfterBrowserRun(input: {
  evaluationStatus?: 'pass' | 'fail';
  needsReauth?: boolean;
}): boolean {
  return input.evaluationStatus === 'fail' || input.needsReauth === true;
}

/**
 * Task statuses a scheduled run must NEVER overwrite — deliberate human
 * decisions. `not_relevant` is set by a person (with a justification) to exclude
 * the task from compliance; an automation flipping it to done/failed would
 * silently destroy that decision. Mirrors the codebase norm (cloud-security
 * skips `not_relevant` as "user intent"). Single source of truth for both the
 * exported guard and the atomic status-update WHERE clauses below.
 */
export const AUTOMATION_PROTECTED_TASK_STATUSES = ['not_relevant'] as const;

export function isTaskStatusProtectedFromAutomation(status: string): boolean {
  return (AUTOMATION_PROTECTED_TASK_STATUSES as readonly string[]).includes(
    status,
  );
}

/**
 * Worker task that runs a single browser automation.
 *
 * Triggered by the per-org runner (run-org-browser-automations), which waits on
 * a batch of these and sends ONE bundled failure email per org. This worker's
 * job is only to run the automation and flip the task's status; notifications
 * are the runner's responsibility (mirrors the integration check worker).
 */
export const runBrowserAutomation = task({
  id: 'run-browser-automation',
  maxDuration: 60 * 10, // 10 minutes per automation — Trigger.dev maxDuration is in SECONDS
  queue: {
    concurrencyLimit: browserAutomationConcurrencyLimit(),
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: {
    automationId: string;
    automationName: string;
    organizationId: string;
    taskId: string;
  }) => {
    const { automationId, automationName, organizationId, taskId } = payload;

    await tags.add([`org:${organizationId}`]);

    logger.info(`Running browser automation "${automationName}"`, {
      automationId,
      organizationId,
      taskId,
    });

    // Verify automation exists and is enabled
    const automation = await db.browserAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      logger.error(`Automation not found: ${automationId}`);
      return { success: false, error: 'Automation not found' };
    }

    if (!automation.isEnabled) {
      logger.info(`Automation ${automationId} is disabled, skipping`);
      return { success: false, error: 'Automation is disabled', skipped: true };
    }

    // Get task details for email notifications
    const taskDetails = await db.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    const taskTitle = taskDetails?.title ?? 'Unknown Task';

    // Run the automation
    const result = await browserbaseService.runBrowserAutomation(
      automationId,
      organizationId,
    );

    // Whether THIS run flipped the task into `failed` (transition only). The
    // per-org bundled failure email (next change) reports only these.
    let statusChangedToFailed = false;

    if (result.success) {
      logger.info(`Automation ${automationId} completed successfully`, {
        runId: result.runId,
        screenshotUrl: result.screenshotUrl ? 'captured' : 'none',
      });

      if (
        shouldMarkTaskDoneAfterBrowserRun({
          screenshotUrl: result.screenshotUrl,
          evaluationCriteria: automation.evaluationCriteria,
          evaluationStatus: result.evaluationStatus,
        })
      ) {
        const currentTask = await db.task.findUnique({
          where: { id: taskId },
          select: { frequency: true },
        });

        let reviewDate: Date | undefined;
        if (currentTask?.frequency) {
          reviewDate = new Date();
          switch (currentTask.frequency) {
            case 'monthly':
              reviewDate.setMonth(reviewDate.getMonth() + 1);
              break;
            case 'quarterly':
              reviewDate.setMonth(reviewDate.getMonth() + 3);
              break;
            case 'yearly':
              reviewDate.setFullYear(reviewDate.getFullYear() + 1);
              break;
          }
        }

        // Atomic: flip to done only if it isn't already done and isn't a
        // protected human status — the guard is in the WHERE, so a concurrent
        // `not_relevant` action can't be clobbered between a read and the write.
        const doneUpdate = await db.task.updateMany({
          where: {
            id: taskId,
            status: { notIn: ['done', ...AUTOMATION_PROTECTED_TASK_STATUSES] },
          },
          data: { status: 'done', ...(reviewDate ? { reviewDate } : {}) },
        });
        if (doneUpdate.count > 0) logger.info(`Task ${taskId} marked as done`);
      }
    } else {
      logger.error(`Automation ${automationId} failed`, {
        runId: result.runId,
        error: result.error,
        needsReauth: result.needsReauth,
        evaluationStatus: result.evaluationStatus,
      });

      // A real control failure (verdict `fail`) or a broken connection
      // (`needsReauth`) means the task is no longer satisfied — flip it to
      // `failed` so the dashboard reflects reality instead of keeping a stale
      // `done`. An infra-only failure (timeout, model unavailable, …) is left
      // alone (see shouldMarkTaskFailedAfterBrowserRun) so it retries next tick.
      if (
        shouldMarkTaskFailedAfterBrowserRun({
          evaluationStatus: result.evaluationStatus,
          needsReauth: result.needsReauth,
        })
      ) {
        // Atomic transition: flip to failed only if it isn't already failed and
        // isn't a protected human status (e.g. `not_relevant`). The guard lives
        // in the WHERE so a concurrent human action can't be overwritten between
        // a read and the write; count > 0 means THIS run caused the transition
        // (which drives the per-org bundled failure email).
        const failedUpdate = await db.task.updateMany({
          where: {
            id: taskId,
            status: { notIn: ['failed', ...AUTOMATION_PROTECTED_TASK_STATUSES] },
          },
          data: { status: 'failed' },
        });
        if (failedUpdate.count > 0) {
          statusChangedToFailed = true;
        } else {
          logger.info(
            `Task ${taskId} was already in failed status; not re-reporting`,
          );
        }
      }
    }

    // Record a successful run on the automation so the orchestrator's
    // schedule filter (`isDueToday`) can skip it on the next tick. "Executed"
    // here means the automation actually ran — including runs whose evaluation
    // legitimately returned `fail`. We skip the write when the automation
    // genuinely couldn't execute (e.g. `needsReauth` / missing browser context
    // / other transient infra errors) so the next orchestrator tick retries
    // instead of waiting a full schedule period.
    const executed =
      result.success === true || result.evaluationStatus === 'fail';

    if (executed) {
      await db.browserAutomation.update({
        where: { id: automationId },
        data: { lastRunAt: new Date() },
      });
    }

    return {
      success: result.success,
      runId: result.runId,
      screenshotUrl: result.screenshotUrl,
      error: result.error,
      needsReauth: result.needsReauth,
      failureCode: result.failureCode,
      // Consumed by the per-org bundled failure email (next change).
      taskId,
      taskTitle,
      evaluationStatus: result.evaluationStatus,
      statusChangedToFailed,
    };
  },
});
