import { getManifest, runAllChecks } from '@comp/integration-platform';
import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';

const TEMPLATE_TO_CHECK: Record<string, string> = {
  frk_tt_68406f411fe27e47a0d6d5f3: 'website_tls_https',
  frk_tt_6840791cac0a7b780dbaf932: 'website_public_policies',
  frk_tt_68406a514e90bb6e32e0b107: 'website_contact_information',
};

const WEBSITE_TASK_TEMPLATE_IDS = Object.keys(TEMPLATE_TO_CHECK);

/**
 * Runs all website compliance checks for a single organization.
 * Triggered during onboarding after the org and website connection are created.
 */
export const runWebsiteChecksForOrg = task({
  id: 'run-website-checks-for-org',
  maxDuration: 1000 * 60 * 10,
  run: async (payload: { organizationId: string }) => {
    const { organizationId } = payload;

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { website: true },
    });

    if (!org?.website) {
      logger.info('Organization has no website, skipping website checks');
      return { success: true, skipped: true };
    }

    const provider = await db.integrationProvider.findUnique({
      where: { slug: 'website' },
    });

    if (!provider) {
      logger.warn('Website provider not found, skipping');
      return { success: false, error: 'Provider not seeded' };
    }

    let connection = await db.integrationConnection.findFirst({
      where: { providerId: provider.id, organizationId },
    });

    if (!connection) {
      connection = await db.integrationConnection.create({
        data: {
          providerId: provider.id,
          organizationId,
          status: 'active',
          authStrategy: 'custom',
          variables: { website: org.website },
        },
      });
    }

    const tasks = await db.task.findMany({
      where: {
        organizationId,
        taskTemplateId: { in: WEBSITE_TASK_TEMPLATE_IDS },
      },
      select: { id: true, title: true, taskTemplateId: true },
    });

    if (tasks.length === 0) {
      logger.info('No website-related tasks found for org');
      return { success: true, skipped: true };
    }

    const manifest = getManifest('website');
    if (!manifest) {
      logger.error('Website manifest not found');
      return { success: false, error: 'Manifest not found' };
    }

    logger.info(
      `Running website checks for org ${organizationId} (${tasks.length} tasks)`,
      { website: org.website },
    );

    for (const t of tasks) {
      if (!t.taskTemplateId) continue;
      const checkId = TEMPLATE_TO_CHECK[t.taskTemplateId];
      if (!checkId) continue;

      try {
        const result = await runAllChecks({
          manifest,
          credentials: { website: org.website },
          variables: {},
          connectionId: connection.id,
          organizationId,
          checkId,
        });

        const checkResult = result.results[0];
        if (!checkResult) continue;

        const checkRun = await db.integrationCheckRun.create({
          data: {
            connectionId: connection.id,
            taskId: t.id,
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
          await db.task.update({
            where: { id: t.id },
            data: { status: 'failed' },
          });
        } else if (hasPassed) {
          const currentTask = await db.task.findUnique({
            where: { id: t.id },
            select: { status: true, frequency: true },
          });

          if (currentTask && currentTask.status !== 'done') {
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
              where: { id: t.id },
              data: {
                status: 'done',
                ...(reviewDate ? { reviewDate } : {}),
              },
            });
          }
        }

        logger.info(`Completed check ${checkId} for task ${t.id}`, {
          passed: checkResult.result.passingResults.length,
          findings: checkResult.result.findings.length,
        });
      } catch (error) {
        logger.error(`Failed check ${checkId} for task ${t.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await db.integrationConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return { success: true, tasksChecked: tasks.length };
  },
});
