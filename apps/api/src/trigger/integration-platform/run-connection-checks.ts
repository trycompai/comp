import { getManifest, runAllChecks } from '@trycompai/integration-platform';
import { db } from '@db';
import { logger, tags, task } from '@trigger.dev/sdk';
import {
  getAccessToken,
  requestValidCredentials,
  type IntegrationCredentialValues,
} from './ensure-valid-credentials';
import { runChecksOnServer } from './run-checks-on-server';

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
  }) => {
    const { connectionId, organizationId, providerSlug } = payload;

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

    const apiUrl = process.env.BASE_URL || 'http://localhost:3333';

    // AWS checks run ON OUR SERVER (see below), which decrypts the credentials
    // and assumes the cross-account role there. Skip the Trigger-side credential
    // preflight for AWS — running it would add redundant failure points (a
    // transient preflight error would falsely fail an AWS run that
    // `runChecksOnServer` could have completed).
    let credentials: IntegrationCredentialValues = {};
    let handleTokenRefresh: (() => Promise<string | null>) | undefined;

    if (providerSlug !== 'aws') {
      logger.info('Ensuring valid credentials...');
      const credentialsResult = await requestValidCredentials({
        apiUrl,
        connectionId,
        organizationId,
      });

      if (!credentialsResult.success || !credentialsResult.credentials) {
        const errorMessage =
          credentialsResult.error || 'Failed to validate credentials';
        logger.error(errorMessage);
        return { success: false, error: errorMessage };
      }
      credentials = credentialsResult.credentials;

      handleTokenRefresh = async (): Promise<string | null> => {
        logger.info('Force refreshing OAuth credentials after provider 401...');
        const refreshResult = await requestValidCredentials({
          apiUrl,
          connectionId,
          organizationId,
          forceRefresh: true,
        });

        if (!refreshResult.success || !refreshResult.credentials) {
          logger.error(refreshResult.error || 'Forced token refresh failed');
          return null;
        }

        credentials = refreshResult.credentials;
        return getAccessToken(credentials) ?? null;
      };

      // Validate credentials based on auth type
      if (manifest.auth.type === 'oauth2' && !getAccessToken(credentials)) {
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
    }

    const variables =
      (connection.variables as Record<
        string,
        string | number | boolean | string[] | undefined
      >) || {};

    // Create a check run record
    const checkRun = await db.integrationCheckRun.create({
      data: {
        connectionId,
        checkId: 'all',
        checkName: 'All Checks (Auto)',
        status: 'running',
        startedAt: new Date(),
      },
    });

    let totalFindings = 0;
    let totalPassing = 0;

    try {
      // AWS checks run ON OUR SERVER so their S3 calls egress our VPC (allowed)
      // instead of Trigger.dev's (blocked). Every other provider keeps running
      // here in the Trigger.dev runtime, unchanged. Same result shape either
      // way, so the persistence below is shared.
      const result =
        providerSlug === 'aws'
          ? await runChecksOnServer({ apiUrl, connectionId, organizationId })
          : await runAllChecks({
              manifest,
              accessToken: getAccessToken(credentials),
              credentials,
              variables,
              connectionId,
              organizationId,
              onTokenRefresh:
                manifest.auth.type === 'oauth2'
                  ? handleTokenRefresh
                  : undefined,
              logger: {
                info: (msg, data) => logger.info(msg, data),
                warn: (msg, data) => logger.warn(msg, data),
                error: (msg, data) => logger.error(msg, data),
              },
            });

      totalFindings = result.totalFindings;
      totalPassing = result.totalPassing;

      logger.info(
        `Checks completed: ${totalFindings} findings, ${totalPassing} passing`,
      );

      // Store results
      const resultsToStore = result.results.flatMap((checkResult) => [
        ...checkResult.result.findings.map((finding) => ({
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
        ...checkResult.result.passingResults.map((passing) => ({
          checkRunId: checkRun.id,
          passed: true,
          title: passing.title,
          description: passing.description || '',
          resourceType: passing.resourceType,
          resourceId: passing.resourceId,
          severity: 'info' as const,
          remediation: undefined,
          evidence: JSON.parse(JSON.stringify(passing.evidence || {})),
        })),
      ]);

      if (resultsToStore.length > 0) {
        await db.integrationCheckResult.createMany({ data: resultsToStore });
      }

      // Update check run status
      const startTime = checkRun.startedAt?.getTime() ?? Date.now();
      await db.integrationCheckRun.update({
        where: { id: checkRun.id },
        data: {
          status: totalFindings > 0 ? 'failed' : 'success',
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          totalChecked: result.results.length,
          passedCount: totalPassing,
          failedCount: totalFindings,
        },
      });

      // Update connection's lastSyncAt
      await db.integrationConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        checkRunId: checkRun.id,
        totalPassing,
        totalFindings,
      };
    } catch (error) {
      logger.error('Check execution failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Mark check run as failed
      const errorStartTime = checkRun.startedAt?.getTime() ?? Date.now();
      await db.integrationCheckRun.update({
        where: { id: checkRun.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          durationMs: Date.now() - errorStartTime,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
