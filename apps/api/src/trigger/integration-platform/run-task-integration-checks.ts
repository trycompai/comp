import { getManifest, runAllChecks } from '@comp/integration-platform';
import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk';

/**
 * Worker task that runs integration checks for a single task.
 * Triggered by the orchestrator (integration-checks-schedule).
 */
export const runTaskIntegrationChecks = task({
  id: 'run-task-integration-checks',
  maxDuration: 1000 * 60 * 15, // 15 minutes per task
  run: async (payload: {
    taskId: string;
    taskTitle: string;
    connectionId: string;
    providerSlug: string;
    organizationId: string;
    checkIds: string[];
  }) => {
    const {
      taskId,
      taskTitle,
      connectionId,
      providerSlug,
      organizationId,
      checkIds,
    } = payload;

    logger.info(`Running integration checks for task "${taskTitle}"`, {
      taskId,
      connectionId,
      provider: providerSlug,
      checkCount: checkIds.length,
    });

    const manifest = getManifest(providerSlug);

    if (!manifest) {
      logger.error(`Manifest not found for provider: ${providerSlug}`);
      return { success: false, error: `Manifest not found: ${providerSlug}` };
    }

    // Get connection
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'active') {
      logger.error(`Connection not found or inactive: ${connectionId}`);
      return { success: false, error: 'Connection not found or inactive' };
    }

    // Ensure we have valid credentials (refresh OAuth tokens if needed)
    const apiUrl = process.env.BASE_URL || 'http://localhost:3333';
    let credentials: Record<string, string>;

    try {
      logger.info('Ensuring valid credentials (refreshing if needed)...');
      const response = await fetch(
        `${apiUrl}/v1/integrations/connections/${connectionId}/ensure-valid-credentials?organizationId=${organizationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { message?: string }).message ||
          `Failed to get valid credentials: ${response.status}`;
        logger.error(errorMessage);

        // If unauthorized, mark connection as error
        if (response.status === 401) {
          await db.integrationConnection.update({
            where: { id: connectionId },
            data: {
              status: 'error',
              errorMessage:
                'OAuth token expired. Please reconnect the integration.',
            },
          });
        }

        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as {
        success: boolean;
        credentials: Record<string, string>;
      };
      credentials = result.credentials;
      logger.info('Credentials validated successfully');
    } catch (error) {
      logger.error('Failed to ensure valid credentials', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, error: 'Failed to validate credentials' };
    }

    // Validate credentials based on auth type
    if (manifest.auth.type === 'oauth2' && !credentials.access_token) {
      logger.error(
        `No OAuth access token found for connection: ${connectionId}`,
      );
      return {
        success: false,
        error: 'No OAuth access token found. Please reconnect.',
      };
    }

    if (
      manifest.auth.type === 'custom' &&
      Object.keys(credentials).length === 0
    ) {
      logger.error(
        `No credentials found for custom integration: ${connectionId}`,
      );
      return {
        success: false,
        error: 'No credentials found for custom integration',
      };
    }

    const variables =
      (connection.variables as Record<
        string,
        string | number | boolean | string[] | undefined
      >) || {};

    // Track overall results across all checks for this task
    let totalFindings = 0;
    let totalPassing = 0;

    // Run only the checks that apply to this task
    try {
      for (const checkId of checkIds) {
        const result = await runAllChecks({
          manifest,
          accessToken: credentials.access_token ?? undefined,
          credentials,
          variables,
          connectionId,
          organizationId,
          checkId, // Run specific check
          logger: {
            info: (msg, data) => logger.info(msg, data),
            warn: (msg, data) => logger.warn(msg, data),
            error: (msg, data) => logger.error(msg, data),
          },
        });

        const checkResult = result.results[0];
        if (!checkResult) continue;

        // Accumulate results
        totalFindings += checkResult.result.findings.length;
        totalPassing += checkResult.result.passingResults.length;

        // Store check run
        const checkRun = await db.integrationCheckRun.create({
          data: {
            connectionId,
            taskId,
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

        // Store individual results
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

        logger.info(`Completed check ${checkId} for task ${taskId}`, {
          passed: checkResult.result.passingResults.length,
          findings: checkResult.result.findings.length,
        });
      }

      // Update connection's lastSyncAt
      await db.integrationConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() },
      });

      // Update task status based on check results
      // If any findings (failures), mark as failed
      // If all passing and no findings, mark as done (only if not already done)
      if (totalFindings > 0) {
        await db.task.update({
          where: { id: taskId },
          data: { status: 'failed' },
        });
        logger.info(
          `Task ${taskId} marked as failed due to ${totalFindings} findings`,
        );
      } else if (totalPassing > 0) {
        // Only update to done if not already done
        const currentTask = await db.task.findUnique({
          where: { id: taskId },
          select: { status: true, frequency: true },
        });
        if (currentTask && currentTask.status !== 'done') {
          // Calculate next review date based on frequency
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
          logger.info(
            `Task ${taskId} marked as done - all ${totalPassing} checks passed${reviewDate ? `, next review: ${reviewDate.toISOString()}` : ''}`,
          );
        }
      }

      return {
        success: true,
        taskId,
        checksRun: checkIds.length,
        totalPassing,
        totalFindings,
        taskStatus:
          totalFindings > 0 ? 'failed' : totalPassing > 0 ? 'done' : null,
      };
    } catch (error) {
      logger.error(`Failed to run checks for task ${taskId}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
