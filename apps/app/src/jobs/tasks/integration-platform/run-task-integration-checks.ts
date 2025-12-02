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
    const { taskId, taskTitle, connectionId, providerSlug, organizationId, checkIds } = payload;

    logger.info(`Running integration checks for task "${taskTitle}"`, {
      taskId,
      connectionId,
      provider: providerSlug,
      checkCount: checkIds.length,
    });

    // Get manifest
    const { getManifest, runAllChecks } = await import('@comp/integration-platform');
    const manifest = getManifest(providerSlug);

    if (!manifest) {
      logger.error(`Manifest not found for provider: ${providerSlug}`);
      return { success: false, error: `Manifest not found: ${providerSlug}` };
    }

    // Get connection with credentials
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
      include: {
        credentialVersions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!connection || connection.status !== 'active') {
      logger.error(`Connection not found or inactive: ${connectionId}`);
      return { success: false, error: 'Connection not found or inactive' };
    }

    const latestCredential = connection.credentialVersions[0];
    if (!latestCredential) {
      logger.error(`No credentials found for connection: ${connectionId}`);
      return { success: false, error: 'No credentials found' };
    }

    // Decrypt credentials
    const { decrypt } = await import('@comp/app/src/lib/encryption');
    const encryptedPayload = latestCredential.encryptedPayload as Record<string, unknown>;
    const credentials: Record<string, string> = {};

    for (const [key, value] of Object.entries(encryptedPayload)) {
      if (
        value &&
        typeof value === 'object' &&
        'encrypted' in value &&
        'iv' in value &&
        'tag' in value &&
        'salt' in value
      ) {
        credentials[key] = await decrypt(
          value as { encrypted: string; iv: string; tag: string; salt: string },
        );
      } else if (typeof value === 'string') {
        credentials[key] = value;
      }
    }

    if (!credentials.access_token) {
      logger.error(`No access token found for connection: ${connectionId}`);
      return { success: false, error: 'No access token found' };
    }

    const variables =
      (connection.variables as Record<string, string | number | boolean | string[] | undefined>) ||
      {};

    // Run only the checks that apply to this task
    try {
      for (const checkId of checkIds) {
        const result = await runAllChecks({
          manifest,
          accessToken: credentials.access_token,
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

        // Store check run
        const checkRun = await db.integrationCheckRun.create({
          data: {
            connectionId,
            taskId,
            checkId: checkResult.checkId,
            checkName: checkResult.checkName,
            status: checkResult.status === 'error' ? 'failed' : checkResult.status,
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: checkResult.durationMs,
            totalChecked:
              checkResult.result.summary?.totalChecked ||
              checkResult.result.passingResults.length + checkResult.result.findings.length,
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
            evidence: r.evidence ? JSON.parse(JSON.stringify(r.evidence)) : undefined,
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
            evidence: f.evidence ? JSON.parse(JSON.stringify(f.evidence)) : undefined,
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

      return {
        success: true,
        taskId,
        checksRun: checkIds.length,
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
