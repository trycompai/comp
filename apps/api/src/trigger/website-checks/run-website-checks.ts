import { getManifest, runAllChecks } from '@comp/integration-platform';
import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';
import { sendEmail } from '../../email/resend';
import { TaskStatusChangedEmail } from '../../email/templates/task-status-changed';
import { isUserUnsubscribed } from '@trycompai/email';

const TEMPLATE_TO_CHECK: Record<string, string> = {
  frk_tt_68406f411fe27e47a0d6d5f3: 'website_tls_https',
  frk_tt_6840791cac0a7b780dbaf932: 'website_public_policies',
  frk_tt_68406a514e90bb6e32e0b107: 'website_contact_information',
};

async function sendTaskStatusChangeEmails(params: {
  organizationId: string;
  taskId: string;
  taskTitle: string;
  oldStatus: string;
  newStatus: 'done' | 'failed';
}) {
  const { organizationId, taskId, taskTitle, oldStatus, newStatus } = params;

  try {
    const [organization, taskRecord, allMembers] = await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
      db.task.findUnique({
        where: { id: taskId },
        select: {
          assignee: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      db.member.findMany({
        where: { organizationId, deactivated: false },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const organizationName = organization?.name ?? 'your organization';
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.BETTER_AUTH_URL ||
      'https://app.trycomp.ai';
    const taskUrl = `${appUrl}/${organizationId}/tasks/${taskId}`;

    const adminMembers = allMembers.filter(
      (m) =>
        m.role && (m.role.includes('admin') || m.role.includes('owner')),
    );

    const recipientMap = new Map<
      string,
      { id: string; name: string; email: string }
    >();

    if (taskRecord?.assignee?.user?.id && taskRecord.assignee.user.email) {
      recipientMap.set(taskRecord.assignee.user.id, {
        id: taskRecord.assignee.user.id,
        name: taskRecord.assignee.user.name?.trim() || taskRecord.assignee.user.email.trim(),
        email: taskRecord.assignee.user.email,
      });
    }

    for (const member of adminMembers) {
      if (member.user?.id && member.user.email) {
        recipientMap.set(member.user.id, {
          id: member.user.id,
          name: member.user.name?.trim() || member.user.email.trim(),
          email: member.user.email,
        });
      }
    }

    const recipients = Array.from(recipientMap.values());

    await Promise.allSettled(
      recipients.map(async (recipient) => {
        const isUnsubscribed = await isUserUnsubscribed(
          db,
          recipient.email,
          'taskAssignments',
        );
        if (isUnsubscribed) return;

        try {
          await sendEmail({
            to: recipient.email,
            subject: `Task "${taskTitle}" status changed to ${newStatus}`,
            react: TaskStatusChangedEmail({
              toName: recipient.name,
              toEmail: recipient.email,
              taskTitle,
              oldStatus: oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1),
              newStatus: newStatus === 'failed' ? 'Failed' : 'Done',
              changedByName: 'Website Check',
              organizationName,
              taskUrl,
            }),
            system: true,
          });
        } catch (error) {
          logger.error(`Failed to send email to ${recipient.email}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }),
    );
  } catch (error) {
    logger.error('Failed to send task status change emails', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export const runWebsiteChecks = task({
  id: 'run-website-checks',
  maxDuration: 1000 * 60 * 15,
  run: async (payload: {
    organizationId: string;
    website: string;
    connectionId: string;
    tasks: Array<{ taskId: string; taskTitle: string; templateId: string }>;
  }) => {
    const { organizationId, website, connectionId, tasks } = payload;

    logger.info(`Running website checks for org ${organizationId}`, {
      website,
      taskCount: tasks.length,
    });

    const manifest = getManifest('website');
    if (!manifest) {
      logger.error('Website manifest not found in registry');
      return { success: false, error: 'Website manifest not found' };
    }

    for (const t of tasks) {
      const checkId = TEMPLATE_TO_CHECK[t.templateId];
      if (!checkId) {
        logger.warn(`No check mapping for template ${t.templateId}`);
        continue;
      }

      logger.info(`Running check ${checkId} for task "${t.taskTitle}"`);

      try {
        const result = await runAllChecks({
          manifest,
          credentials: { website },
          variables: {},
          connectionId,
          organizationId,
          checkId,
        });

        const checkResult = result.results[0];
        if (!checkResult) continue;

        const checkRun = await db.integrationCheckRun.create({
          data: {
            connectionId,
            taskId: t.taskId,
            checkId: checkResult.checkId,
            checkName: checkResult.checkName,
            status:
              checkResult.status === 'error' ? 'failed' : checkResult.status,
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: checkResult.durationMs,
            totalChecked:
              checkResult.result.summary?.totalChecked ||
              checkResult.result.passingResults.length +
                checkResult.result.findings.length,
            passedCount: checkResult.result.passingResults.length,
            failedCount: checkResult.result.findings.length,
            errorMessage: checkResult.error,
            logs: JSON.parse(JSON.stringify(checkResult.result.logs)),
          },
        });

        const resultsToStore = [
          ...checkResult.result.passingResults.map((r) => ({
            checkRunId: checkRun.id,
            passed: true,
            resourceType: r.resourceType,
            resourceId: r.resourceId,
            title: r.title,
            description: r.description,
            evidence: r.evidence
              ? JSON.parse(JSON.stringify(r.evidence))
              : undefined,
          })),
          ...checkResult.result.findings.map((f) => ({
            checkRunId: checkRun.id,
            passed: false,
            resourceType: f.resourceType,
            resourceId: f.resourceId,
            title: f.title,
            description: f.description,
            severity: f.severity,
            remediation: f.remediation,
            evidence: f.evidence
              ? JSON.parse(JSON.stringify(f.evidence))
              : undefined,
          })),
        ];

        if (resultsToStore.length > 0) {
          await db.integrationCheckResult.createMany({ data: resultsToStore });
        }

        const hasFailed =
          checkResult.result.findings.length > 0 ||
          checkResult.status === 'error' ||
          checkResult.status === 'failed';
        const hasPassed = checkResult.result.passingResults.length > 0;

        if (hasFailed) {
          const taskBefore = await db.task.findUnique({
            where: { id: t.taskId },
            select: { status: true },
          });
          const oldStatus = taskBefore?.status ?? 'todo';

          await db.task.update({
            where: { id: t.taskId },
            data: { status: 'failed' },
          });

          if (oldStatus !== 'failed') {
            await sendTaskStatusChangeEmails({
              organizationId,
              taskId: t.taskId,
              taskTitle: t.taskTitle,
              oldStatus,
              newStatus: 'failed',
            });
          }
        } else if (hasPassed) {
          const currentTask = await db.task.findUnique({
            where: { id: t.taskId },
            select: { status: true, frequency: true },
          });

          if (currentTask && currentTask.status !== 'done') {
            const oldStatus = currentTask.status;

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
              where: { id: t.taskId },
              data: {
                status: 'done',
                ...(reviewDate ? { reviewDate } : {}),
              },
            });

            await sendTaskStatusChangeEmails({
              organizationId,
              taskId: t.taskId,
              taskTitle: t.taskTitle,
              oldStatus,
              newStatus: 'done',
            });
          }
        }

        logger.info(`Completed check ${checkId} for task ${t.taskId}`, {
          passed: checkResult.result.passingResults.length,
          findings: checkResult.result.findings.length,
        });
      } catch (error) {
        logger.error(`Failed to run check ${checkId} for task ${t.taskId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await db.integrationConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    return { success: true, tasksChecked: tasks.length };
  },
});
