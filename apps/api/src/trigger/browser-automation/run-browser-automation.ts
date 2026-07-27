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
 * Task statuses a scheduled run must NOT overwrite — a deliberate human decision.
 * `not_relevant` is set by a person (with a justification) to exclude the task
 * from compliance; an automation flipping it to done/failed would silently
 * destroy that decision. Mirrors the codebase norm (cloud-security skips
 * `not_relevant` "user intent"). Exported for unit testing.
 */
export function isTaskStatusProtectedFromAutomation(status: string): boolean {
  return status === 'not_relevant';
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
          select: { status: true, frequency: true },
        });

        if (
          currentTask &&
          currentTask.status !== 'done' &&
          !isTaskStatusProtectedFromAutomation(currentTask.status)
        ) {
          let reviewDate: Date | undefined;
          if (currentTask.frequency) {
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

          await db.task.update({
            where: { id: taskId },
            data: {
              status: 'done',
              ...(reviewDate ? { reviewDate } : {}),
            },
          });

          logger.info(`Task ${taskId} marked as done`);
        }
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
        const taskBeforeUpdate = await db.task.findUnique({
          where: { id: taskId },
          select: { status: true },
        });
        const oldStatus = taskBeforeUpdate?.status ?? 'todo';

        // Transition only: don't re-flip / re-report a task that's already
        // failed. Also never overwrite a deliberate human decision like
        // `not_relevant`. The per-org runner (run-org-browser-automations)
        // collects these transitions and sends one bundled failure email —
        // covering both `needs_reauth` and control-regressed (`evaluation fail`).
        if (
          oldStatus !== 'failed' &&
          !isTaskStatusProtectedFromAutomation(oldStatus)
        ) {
          await db.task.update({
            where: { id: taskId },
            data: { status: 'failed' },
          });
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
