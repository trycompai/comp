import { db } from '@db';
import { logger, queue, task } from '@trigger.dev/sdk';
import { isUserUnsubscribed } from '@trycompai/email';
import { triggerEmail } from '../../email/trigger-email';
import { AutomationBulkFailuresEmail } from '../../email/templates/automation-bulk-failures';
import {
  runTaskIntegrationChecks,
  type TaskCheckRunResult,
} from './run-task-integration-checks';

/** One task scheduled for an org, as handed down by the orchestrator. */
export interface OrgTaskCheck {
  taskId: string;
  taskTitle: string;
  connectionId: string;
  providerSlug: string;
  checkIds: string[];
}

/** A task that freshly transitioned into `failed` during this run. */
export interface FailedTaskSummary {
  taskId: string;
  taskTitle: string;
  failedCount: number;
  totalCount: number;
}

// Bound how many per-org runners wait concurrently. The child checks run on the
// default queue at full env concurrency; only the PARENTS are capped here, so a
// day with many orgs can't pin the whole environment with runners that are
// merely suspended waiting on their children.
const orgRunnerQueue = queue({
  name: 'integration-checks-org-runner',
  concurrencyLimit: 50,
});

// Chunk large orgs: batchTriggerAndWait accepts a bounded number of items per
// call (the orchestrator already self-limits its own triggers the same way).
const CHILD_BATCH_SIZE = 100;

/**
 * Reduce the results of a batchTriggerAndWait over runTaskIntegrationChecks to
 * the tasks that freshly failed. Pure + exported for unit testing.
 *
 * Errored/crashed child runs (`!ok`) and runs that didn't transition into
 * `failed` are dropped — matching the prior behavior where an already-failed or
 * errored task produced no email (it just retries on the next orchestrator tick).
 */
export function collectFailedTasks(
  runs: Array<{ ok: boolean; output?: TaskCheckRunResult }>,
): FailedTaskSummary[] {
  const failed: FailedTaskSummary[] = [];
  for (const run of runs) {
    if (!run.ok || !run.output || run.output.success !== true) continue;
    if (!run.output.statusChangedToFailed) continue;
    failed.push({
      taskId: run.output.taskId,
      taskTitle: run.output.taskTitle,
      failedCount: run.output.failedCount,
      totalCount: run.output.totalCount,
    });
  }
  return failed;
}

type Recipient = { id: string; name: string; email: string };

function toRecipient(user: {
  id: string;
  name: string | null;
  email: string;
}): Recipient {
  return {
    id: user.id,
    name: user.name?.trim() || user.email.trim() || 'User',
    email: user.email,
  };
}

/**
 * Recipients for an org's bundled failure email: the assignees of the failed
 * tasks UNION the org's admins/owners (by EXACT member-role token), deduped by
 * user id. Mirrors the canonical getOwnerAdminRecipients resolver in
 * task-notifier.service.ts.
 *
 * Note the deliberate product change: every recipient receives the FULL org
 * digest (all tasks that failed this run), so a non-admin assignee now sees the
 * org's other failed tasks too — not just their own. This is the intended
 * "one bundled email per org" behavior (replacing one email per failing task).
 */
async function resolveRecipients(params: {
  organizationId: string;
  failedTaskIds: string[];
}): Promise<Recipient[]> {
  const { organizationId, failedTaskIds } = params;

  const [tasks, allMembers] = await Promise.all([
    db.task.findMany({
      where: { id: { in: failedTaskIds }, organizationId },
      select: {
        assignee: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    }),
    db.member.findMany({
      where: {
        organizationId,
        deactivated: false,
      },
      select: {
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const recipientMap = new Map<string, Recipient>();

  // Assignees of the failed tasks.
  for (const t of tasks) {
    const user = t.assignee?.user;
    if (user?.id && user.email) recipientMap.set(user.id, toRecipient(user));
  }

  // Org admins/owners. member.role is a comma-separated list (e.g.
  // "admin,auditor"); match EXACT role tokens, not substrings, so a custom role
  // like "co-owner" or "billing-admin" is not mistaken for owner/admin.
  for (const member of allMembers) {
    const roles = (member.role ?? '').split(',').map((r) => r.trim());
    if (!roles.includes('admin') && !roles.includes('owner')) continue;
    const user = member.user;
    if (user?.id && user.email) recipientMap.set(user.id, toRecipient(user));
  }

  return Array.from(recipientMap.values());
}

/**
 * Send ONE bundled email per recipient listing every task that failed this run,
 * replacing the previous one-email-per-failing-task spam. Exported for testing.
 */
export async function sendBundledFailureEmails(params: {
  organizationId: string;
  organizationName: string;
  failedTasks: FailedTaskSummary[];
}): Promise<void> {
  const { organizationId, organizationName, failedTasks } = params;
  if (failedTasks.length === 0) return;

  // The email is best-effort: a failure here (e.g. a transient DB blip while
  // resolving recipients) must NOT throw out of the runner, which would fail it
  // and retry the WHOLE org's checks — and since the tasks are already `failed`
  // by then, the retry would report no transitions and the email would be lost
  // forever. Mirrors the old per-task email's outer try/catch guard.
  try {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.BETTER_AUTH_URL ||
      'https://app.trycomp.ai';
    const tasksUrl = `${appUrl}/${organizationId}/tasks`;

    const recipients = await resolveRecipients({
      organizationId,
      failedTaskIds: failedTasks.map((t) => t.taskId),
    });

    const taskItems = failedTasks.map((t) => ({
      title: t.taskTitle,
      url: `${appUrl}/${organizationId}/tasks/${t.taskId}`,
      failedCount: t.failedCount,
      totalCount: t.totalCount,
    }));

    const count = failedTasks.length;
    const taskText = count === 1 ? 'task' : 'tasks';

    await Promise.allSettled(
      recipients.map(async (recipient) => {
        const isUnsubscribed = await isUserUnsubscribed(
          db,
          recipient.email,
          'taskAssignments',
          organizationId,
        );
        if (isUnsubscribed) {
          logger.info(
            `Skipping bundled failure email: ${recipient.email} is unsubscribed`,
          );
          return;
        }

        try {
          await triggerEmail({
            to: recipient.email,
            subject: `${count} ${taskText} failed automated checks in ${organizationName}`,
            react: AutomationBulkFailuresEmail({
              toName: recipient.name,
              toEmail: recipient.email,
              organizationName,
              tasksUrl,
              tasks: taskItems,
            }),
            system: true,
          });
          logger.info(`Bundled failure email sent to ${recipient.email}`);
        } catch (error) {
          logger.error(
            `Failed to send bundled failure email to ${recipient.email}`,
            { error: error instanceof Error ? error.message : 'Unknown error' },
          );
        }
      }),
    );

    logger.info(
      `Sent bundled failure email for ${count} ${taskText} to ${recipients.length} recipient(s) in org ${organizationId}`,
    );
  } catch (error) {
    logger.error('Failed to send bundled failure email(s)', {
      organizationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Per-org runner. The daily orchestrator dispatches ONE of these per org
 * (fire-and-forget). It runs that org's due integration checks in parallel via
 * batchTriggerAndWait, then sends a SINGLE bundled email listing every task that
 * failed this run — instead of one email per failing task.
 *
 * Mirrors the established in-repo nested fan-out pattern (e.g. onboarding's
 * per-org runners that batchTriggerAndWait their work internally).
 */
export const runOrgIntegrationChecks = task({
  id: 'run-org-integration-checks',
  queue: orgRunnerQueue,
  // maxDuration is max COMPUTE time in SECONDS (the suspended wait during
  // batchTriggerAndWait is checkpointed and doesn't count against it). 1h is
  // ample for the runner's own work (collect results + send emails) and matches
  // the sibling batchTriggerAndWait orchestrator (process-knowledge-base-documents).
  maxDuration: 60 * 60, // 1 hour (in seconds)
  run: async (payload: {
    organizationId: string;
    organizationName: string;
    tasks: OrgTaskCheck[];
  }) => {
    const { organizationId, organizationName, tasks } = payload;

    logger.info(
      `Running integration checks for org ${organizationId} (${tasks.length} task(s))`,
    );

    if (tasks.length === 0) {
      return { organizationId, tasksRun: 0, failedTasks: 0, emailed: false };
    }

    const failedTasks: FailedTaskSummary[] = [];

    for (let i = 0; i < tasks.length; i += CHILD_BATCH_SIZE) {
      const batch = tasks.slice(i, i + CHILD_BATCH_SIZE);
      const batchResult = await runTaskIntegrationChecks.batchTriggerAndWait(
        batch.map((t) => ({
          payload: {
            taskId: t.taskId,
            taskTitle: t.taskTitle,
            connectionId: t.connectionId,
            providerSlug: t.providerSlug,
            organizationId,
            checkIds: t.checkIds,
          },
        })),
      );
      failedTasks.push(...collectFailedTasks(batchResult.runs));
    }

    logger.info(
      `Org ${organizationId}: ${failedTasks.length} of ${tasks.length} task(s) transitioned to failed`,
    );

    await sendBundledFailureEmails({
      organizationId,
      organizationName,
      failedTasks,
    });

    return {
      organizationId,
      tasksRun: tasks.length,
      failedTasks: failedTasks.length,
      emailed: failedTasks.length > 0,
    };
  },
});
