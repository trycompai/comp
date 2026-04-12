import { getManifest, runAllChecks } from '@trycompai/integration-platform';
import { db } from '@db';
import { logger, tags, task } from '@trigger.dev/sdk';

/**
 * Trigger task that runs all checks for a connection.
 * Used for auto-running checks after a connection is established.
 */
export const runConnectionChecks = task({
  id: 'run-connection-checks',
  maxDuration: 1000 * 60 * 15, // 15 minutes
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: {
    connectionId: string;
    organizationId: string;
    providerSlug: string;
    skipCheckIds?: string[];
  }) => {
    const { connectionId, organizationId, providerSlug, skipCheckIds } = payload;

    await tags.add([`org:${organizationId}`]);

    logger.info(`Auto-running checks for connection ${connectionId}`, {
      provider: providerSlug,
      organizationId,
    });

    const manifest = getManifest(providerSlug);

    if (!manifest) {
      logger.error(`Manifest not found for provider: ${providerSlug}`);
      return { success: false, error: `Manifest not found: ${providerSlug}` };
    }

    if (!manifest.checks || manifest.checks.length === 0) {
      logger.info(`No checks defined for provider: ${providerSlug}`);
      return { success: true, reason: 'No checks defined' };
    }

    // Get connection
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'active') {
      logger.error(`Connection not found or inactive: ${connectionId}`);
      return { success: false, error: 'Connection not found or inactive' };
    }

    // Check if all required variables are configured
    const requiredVariables = new Set<string>();
    for (const check of manifest.checks) {
      if (check.variables) {
        for (const variable of check.variables) {
          if (variable.required) {
            requiredVariables.add(variable.id);
          }
        }
      }
    }

    const configuredVariables =
      (connection.variables as Record<string, unknown>) || {};
    const missingVariables: string[] = [];

    for (const requiredVar of requiredVariables) {
      const value = configuredVariables[requiredVar];
      if (value === undefined || value === null || value === '') {
        missingVariables.push(requiredVar);
      }
      if (Array.isArray(value) && value.length === 0) {
        missingVariables.push(requiredVar);
      }
    }

    if (missingVariables.length > 0) {
      logger.info(
        `Skipping auto-run: missing required variables: ${missingVariables.join(', ')}`,
      );
      return {
        success: true,
        reason: `Missing required variables: ${missingVariables.join(', ')}`,
      };
    }

    // Ensure we have valid credentials
    const apiUrl = process.env.BASE_URL || 'http://localhost:3333';
    let credentials: Record<string, string>;

    try {
      logger.info('Ensuring valid credentials...');
      const response = await fetch(
        `${apiUrl}/v1/integrations/connections/${connectionId}/ensure-valid-credentials`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-token': process.env.SERVICE_TOKEN_TRIGGER!,
            'x-organization-id': organizationId,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { message?: string }).message ||
          `Failed to get valid credentials: ${response.status}`;
        logger.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      const result = (await response.json()) as {
        success: boolean;
        credentials: Record<string, string>;
      };
      credentials = result.credentials;
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
      return { success: false, error: 'No OAuth access token found' };
    }

    if (
      manifest.auth.type === 'custom' &&
      Object.keys(credentials).length === 0
    ) {
      logger.error(
        `No credentials found for custom integration: ${connectionId}`,
      );
      return { success: false, error: 'No credentials found' };
    }

    const variables =
      (connection.variables as Record<
        string,
        string | number | boolean | string[] | undefined
      >) || {};

    // Filter out disabled checks if skipCheckIds provided
    const skipSet = new Set(skipCheckIds ?? []);
    const filteredManifest = skipSet.size > 0
      ? { ...manifest, checks: (manifest.checks ?? []).filter((c) => !skipSet.has(c.id)) }
      : manifest;

    if (!filteredManifest.checks || filteredManifest.checks.length === 0) {
      logger.info('All checks are disabled for this connection');
      return { success: true, reason: 'All checks disabled', checkRunIds: [] };
    }

    try {
      // Run enabled checks
      const result = await runAllChecks({
        manifest: filteredManifest,
        accessToken: credentials.access_token ?? undefined,
        credentials,
        variables,
        connectionId,
        organizationId,
        logger: {
          info: (msg, data) => logger.info(msg, data),
          warn: (msg, data) => logger.warn(msg, data),
          error: (msg, data) => logger.error(msg, data),
        },
      });

      logger.info(
        `Checks completed: ${result.totalFindings} findings, ${result.totalPassing} passing across ${result.results.length} checks`,
      );

      // Store one IntegrationCheckRun per check with its own results
      const checkRunIds: string[] = [];
      for (const checkResult of result.results) {
        const findings = checkResult.result.findings;
        const passing = checkResult.result.passingResults;
        const startTime = Date.now();

        const checkRun = await db.integrationCheckRun.create({
          data: {
            connectionId,
            checkId: checkResult.checkId,
            checkName: checkResult.checkName,
            status: checkResult.status === 'error' ? 'failed' : checkResult.status === 'failed' ? 'failed' : 'success',
            startedAt: new Date(startTime - checkResult.durationMs),
            completedAt: new Date(),
            durationMs: checkResult.durationMs,
            totalChecked: findings.length + passing.length,
            passedCount: passing.length,
            failedCount: findings.length,
            errorMessage: checkResult.error ?? null,
            logs: checkResult.result.logs.length > 0
              ? (checkResult.result.logs.map((l) => ({
                  level: l.level,
                  message: l.message,
                  ...(l.data ? { data: l.data } : {}),
                  timestamp: l.timestamp.toISOString(),
                })) as unknown as import('@db').Prisma.InputJsonValue)
              : undefined,
          },
        });

        checkRunIds.push(checkRun.id);

        // Store individual results under this check run
        const resultsToStore = [
          ...findings.map((finding) => ({
            checkRunId: checkRun.id,
            passed: false,
            title: finding.title,
            description: finding.description || '',
            resourceType: finding.resourceType,
            resourceId: finding.resourceId,
            severity: finding.severity,
            remediation: finding.remediation,
            evidence: JSON.parse(JSON.stringify(finding.evidence || {})),
          })),
          ...passing.map((p) => ({
            checkRunId: checkRun.id,
            passed: true,
            title: p.title,
            description: p.description || '',
            resourceType: p.resourceType,
            resourceId: p.resourceId,
            severity: 'info' as const,
            remediation: undefined,
            evidence: JSON.parse(JSON.stringify(p.evidence || {})),
          })),
        ];

        if (resultsToStore.length > 0) {
          await db.integrationCheckResult.createMany({ data: resultsToStore });
        }
      }

      // Update connection's lastSyncAt
      await db.integrationConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        checkRunIds,
        totalPassing: result.totalPassing,
        totalFindings: result.totalFindings,
      };
    } catch (error) {
      logger.error('Check execution failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
