import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  getActiveManifests,
  getManifest,
  runAllChecks,
  type CheckRunResult,
  type OAuthConfig,
} from '@comp/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { db } from '@db';
import type { Prisma } from '@prisma/client';

interface TaskIntegrationCheck {
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  checkId: string;
  checkName: string;
  checkDescription: string;
  isConnected: boolean;
  needsConfiguration: boolean;
  connectionId?: string;
  connectionStatus?: string;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed' | 'error';
  lastRunFindings?: number;
  lastRunPassing?: number;
  /** For OAuth providers: whether platform/org admin has configured credentials */
  authType: 'oauth2' | 'custom' | 'api_key' | 'basic' | 'jwt';
  oauthConfigured?: boolean;
}

interface RunCheckForTaskDto {
  connectionId: string;
  checkId: string;
}

@Controller({ path: 'integrations/tasks', version: '1' })
export class TaskIntegrationsController {
  private readonly logger = new Logger(TaskIntegrationsController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly checkRunRepository: CheckRunRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
  ) {}

  /**
   * Get all integration checks that can auto-complete a specific task template
   */
  @Get('template/:templateId/checks')
  async getChecksForTaskTemplate(
    @Param('templateId') templateId: string,
    @Query('organizationId') organizationId: string,
  ): Promise<{ checks: TaskIntegrationCheck[] }> {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const manifests = getActiveManifests();
    const checks: TaskIntegrationCheck[] = [];

    // Get all connections for this org with provider info
    const connectionsRaw =
      await this.connectionRepository.findByOrganization(organizationId);

    // Cast to include provider relation
    const connections = connectionsRaw as Array<
      (typeof connectionsRaw)[0] & { provider?: { slug: string } }
    >;

    for (const manifest of manifests) {
      if (!manifest.checks) continue;

      for (const check of manifest.checks) {
        // Check if this check maps to the requested task template
        if (check.taskMapping === templateId) {
          // Find if there's a connection for this integration
          const connection = connections.find(
            (c) => c.provider?.slug === manifest.id,
          );

          // Check if required variables are configured
          let needsConfiguration = false;
          if (connection && connection.status === 'active' && check.variables) {
            const connectionVars =
              (connection.variables as Record<string, unknown>) || {};
            for (const variable of check.variables) {
              if (variable.required) {
                const value = connectionVars[variable.id];
                if (
                  value === undefined ||
                  value === null ||
                  value === '' ||
                  (Array.isArray(value) && value.length === 0)
                ) {
                  needsConfiguration = true;
                  break;
                }
              }
            }
          }

          // Check if OAuth is configured for OAuth providers
          let oauthConfigured: boolean | undefined;
          if (manifest.auth.type === 'oauth2') {
            const availability =
              await this.oauthCredentialsService.checkAvailability(
                manifest.id,
                organizationId,
              );
            oauthConfigured = availability.available;
          }

          checks.push({
            integrationId: manifest.id,
            integrationName: manifest.name,
            integrationLogoUrl: manifest.logoUrl,
            checkId: check.id,
            checkName: check.name,
            checkDescription: check.description,
            isConnected: !!connection && connection.status === 'active',
            needsConfiguration,
            connectionId: connection?.id,
            connectionStatus: connection?.status,
            authType: manifest.auth.type,
            oauthConfigured,
          });
        }
      }
    }

    return { checks };
  }

  /**
   * Get integration checks for a specific task (by task ID)
   */
  @Get(':taskId/checks')
  async getChecksForTask(
    @Param('taskId') taskId: string,
    @Query('organizationId') organizationId: string,
  ): Promise<{
    checks: TaskIntegrationCheck[];
    task: { id: string; title: string; templateId: string | null };
  }> {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get the task to find its template ID
    const task = await db.task.findUnique({
      where: { id: taskId, organizationId },
      select: { id: true, title: true, taskTemplateId: true },
    });

    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    if (!task.taskTemplateId) {
      return {
        checks: [],
        task: { id: task.id, title: task.title, templateId: null },
      };
    }

    // Get checks for this template
    const { checks } = await this.getChecksForTaskTemplate(
      task.taskTemplateId,
      organizationId,
    );

    return {
      checks,
      task: { id: task.id, title: task.title, templateId: task.taskTemplateId },
    };
  }

  /**
   * Run a specific check for a task and store results
   */
  @Post(':taskId/run-check')
  async runCheckForTask(
    @Param('taskId') taskId: string,
    @Query('organizationId') organizationId: string,
    @Body() body: RunCheckForTaskDto,
  ): Promise<{
    success: boolean;
    result?: CheckRunResult;
    error?: string;
    checkRunId?: string;
    taskStatus?: string | null;
  }> {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { connectionId, checkId } = body;

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    // Get connection
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.status !== 'active') {
      throw new HttpException(
        'Connection is not active',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get provider and manifest
    const provider = await this.providerRepository.findById(
      connection.providerId,
    );
    if (!provider) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new HttpException('Manifest not found', HttpStatus.NOT_FOUND);
    }

    // Get credentials
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);

    // Validate credentials based on auth type
    if (!credentials) {
      throw new HttpException(
        'No credentials found for connection',
        HttpStatus.BAD_REQUEST,
      );
    }

    // For OAuth, require access_token. For custom auth (like AWS), check for required fields
    if (manifest.auth.type === 'oauth2' && !credentials.access_token) {
      throw new HttpException(
        'No valid OAuth credentials found. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // For custom auth, the credentials are the form field values directly
    if (
      manifest.auth.type === 'custom' &&
      Object.keys(credentials).length === 0
    ) {
      throw new HttpException(
        'No valid credentials found for custom integration',
        HttpStatus.BAD_REQUEST,
      );
    }

    const variables =
      (connection.variables as Record<
        string,
        string | number | boolean | string[] | undefined
      >) || {};

    // Find the check definition to get the name
    const checkDef = manifest.checks?.find((c) => c.id === checkId);
    if (!checkDef) {
      throw new HttpException(
        `Check ${checkId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Build token refresh callback for OAuth integrations that support it
    let onTokenRefresh: (() => Promise<string | null>) | undefined;
    if (manifest.auth.type === 'oauth2') {
      const oauthConfig = manifest.auth.config;

      // Only set up refresh callback if provider supports refresh tokens
      const supportsRefresh = oauthConfig.supportsRefreshToken !== false;

      if (supportsRefresh) {
        const oauthCredentials =
          await this.oauthCredentialsService.getCredentials(
            provider.slug,
            organizationId,
          );

        if (oauthCredentials) {
          onTokenRefresh = async () => {
            return this.credentialVaultService.refreshOAuthTokens(
              connectionId,
              {
                tokenUrl: oauthConfig.tokenUrl,
                refreshUrl: oauthConfig.refreshUrl,
                clientId: oauthCredentials.clientId,
                clientSecret: oauthCredentials.clientSecret,
                clientAuthMethod: oauthConfig.clientAuthMethod,
              },
            );
          };
        }
      }
    }

    // Create check run record
    const checkRun = await this.checkRunRepository.create({
      connectionId,
      taskId,
      checkId,
      checkName: checkDef.name,
    });

    try {
      // Run the specific check
      const result = await runAllChecks({
        manifest,
        accessToken: credentials.access_token ?? undefined,
        credentials: credentials,
        variables,
        connectionId,
        organizationId,
        checkId, // Only run this specific check
        onTokenRefresh,
        logger: {
          info: (msg, data) => this.logger.log(msg, data),
          warn: (msg, data) => this.logger.warn(msg, data),
          error: (msg, data) => this.logger.error(msg, data),
        },
      });

      const checkResult = result.results[0];

      if (!checkResult) {
        await this.checkRunRepository.complete(checkRun.id, {
          status: 'failed',
          durationMs: 0,
          totalChecked: 0,
          passedCount: 0,
          failedCount: 0,
          errorMessage: 'Check not found in manifest',
        });
        return { success: false, error: 'Check not found' };
      }

      // Store individual results
      const resultsToStore = [
        // Passing results
        ...checkResult.result.passingResults.map((r) => ({
          checkRunId: checkRun.id,
          passed: true,
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          title: r.title,
          description: r.description,
          evidence: r.evidence as Prisma.InputJsonValue,
        })),
        // Findings (failures)
        ...checkResult.result.findings.map((f) => ({
          checkRunId: checkRun.id,
          passed: false,
          resourceType: f.resourceType,
          resourceId: f.resourceId,
          title: f.title,
          description: f.description,
          severity: f.severity as
            | 'info'
            | 'low'
            | 'medium'
            | 'high'
            | 'critical',
          remediation: f.remediation,
          evidence: f.evidence as Prisma.InputJsonValue,
        })),
      ];

      if (resultsToStore.length > 0) {
        await this.checkRunRepository.addResults(resultsToStore);
      }

      // Complete the check run
      await this.checkRunRepository.complete(checkRun.id, {
        status: checkResult.status === 'error' ? 'failed' : checkResult.status,
        durationMs: checkResult.durationMs,
        totalChecked:
          checkResult.result.summary?.totalChecked ||
          checkResult.result.passingResults.length +
            checkResult.result.findings.length,
        passedCount: checkResult.result.passingResults.length,
        failedCount: checkResult.result.findings.length,
        errorMessage: checkResult.error,
        logs: JSON.parse(
          JSON.stringify(checkResult.result.logs),
        ) as Prisma.InputJsonValue,
      });

      this.logger.log(
        `Check ${checkId} for task ${taskId}: ${checkResult.status} - ${checkResult.result.findings.length} findings, ${checkResult.result.passingResults.length} passing`,
      );

      // Update task status based on check results
      const hasFindings = checkResult.result.findings.length > 0;
      const hasPassing = checkResult.result.passingResults.length > 0;
      const newStatus = hasFindings ? 'failed' : hasPassing ? 'done' : null;

      if (newStatus) {
        // Only update review date if transitioning to done from a different status
        const isTransitioningToDone =
          newStatus === 'done' && task.status !== 'done';

        // Calculate next review date based on frequency
        let reviewDate: Date | undefined;
        if (isTransitioningToDone && task.frequency) {
          reviewDate = new Date();
          switch (task.frequency) {
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
            status: newStatus,
            ...(reviewDate ? { reviewDate } : {}),
          },
        });
        this.logger.log(
          `Updated task ${taskId} status to ${newStatus}${reviewDate ? `, next review: ${reviewDate.toISOString()}` : ''}`,
        );
      }

      return {
        success: true,
        result: checkResult,
        checkRunId: checkRun.id,
        taskStatus: newStatus,
      };
    } catch (error) {
      // Mark run as failed
      await this.checkRunRepository.complete(checkRun.id, {
        status: 'failed',
        durationMs: Date.now() - checkRun.startedAt!.getTime(),
        totalChecked: 0,
        passedCount: 0,
        failedCount: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      this.logger.error(`Failed to run check: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        checkRunId: checkRun.id,
      };
    }
  }

  /**
   * Get check run history for a task
   */
  @Get(':taskId/runs')
  async getTaskCheckRuns(
    @Param('taskId') taskId: string,
    @Query('organizationId') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const runs = await this.checkRunRepository.findByTask(
      taskId,
      limit ? parseInt(limit, 10) : 10,
    );

    return {
      runs: runs.map((run) => ({
        id: run.id,
        checkId: run.checkId,
        checkName: run.checkName,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs: run.durationMs,
        totalChecked: run.totalChecked,
        passedCount: run.passedCount,
        failedCount: run.failedCount,
        errorMessage: run.errorMessage,
        logs: run.logs,
        provider: {
          slug: (run.connection as any).provider?.slug,
          name: (run.connection as any).provider?.name,
        },
        results: run.results.map((r) => ({
          id: r.id,
          passed: r.passed,
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          title: r.title,
          description: r.description,
          severity: r.severity,
          remediation: r.remediation,
          evidence: r.evidence,
          collectedAt: r.collectedAt,
        })),
        createdAt: run.createdAt,
      })),
    };
  }
}
