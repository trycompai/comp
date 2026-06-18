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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import {
  getActiveManifests,
  getManifest,
  runAllChecks,
} from '@trycompai/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { TaskIntegrationChecksService } from '../services/task-integration-checks.service';
import { getStringValue } from '../utils/credential-utils';
import { isTaskCheckEnabled } from '../utils/disabled-task-checks';
import { isTaskRunEnabledByDefault } from '../utils/task-check-defaults';
import { getProviderSummary } from '../utils/provider-summary';
import { getConnectionLabel } from '../utils/connection-label';
import { loadActiveExceptionSet } from '../../cloud-security/finding-exceptions';
import {
  countEffectiveFailures,
  decideTaskStatus,
} from '../utils/task-check-evaluation';
import { db } from '@db';
import type { IntegrationConnection, Prisma } from '@db';

/** Manifest + check types derived from the integration-platform registry. */
type IntegrationManifest = NonNullable<ReturnType<typeof getManifest>>;
type IntegrationCheckDef = NonNullable<IntegrationManifest['checks']>[number];

/** Outcome of running one check against one connection (account). */
interface ConnectionCheckOutcome {
  connectionId: string;
  checkRunId: string;
  status: 'success' | 'failed' | 'error';
  findings: number;
  passing: number;
  /** resourceIds of this account's failing findings, for exception filtering. */
  failingResourceIds: string[];
}

interface TaskIntegrationCheck {
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  checkId: string;
  checkName: string;
  checkDescription: string;
  isConnected: boolean;
  /** True when the check has been manually disconnected from this task. */
  isDisabledForTask: boolean;
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

// Classes (not interfaces) so @nestjs/swagger can emit a body schema. Both
// carry class-validator decorators so the global ValidationPipe doesn't reject
// the body with "property X should not exist" (whitelist + forbidNonWhitelisted).
class RunCheckForTaskDto {
  // UI sends organizationId in the body; ignored by the handler (derived from auth).
  @ApiPropertyOptional({
    description:
      'Auto-resolved from your API key / session. You can omit this; it is ignored by the server.',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description:
      'ID of the integration connection that owns the check (call list-connections to find it).',
    example: 'conn_abc123',
  })
  @IsString()
  connectionId!: string;

  @ApiProperty({
    description:
      'ID of the integration check to run (from the provider manifest — call list-checks-for-task to find available ones).',
    example: 'aws-s3-bucket-public-access',
  })
  @IsString()
  checkId!: string;
}

class ToggleCheckForTaskDto {
  // UI sends organizationId in the body; ignored by the handler (derived from auth).
  @ApiPropertyOptional({
    description:
      'Auto-resolved from your API key / session. You can omit this; it is ignored by the server.',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description:
      'ID of the integration connection whose check is being disconnected from / reconnected to this task.',
    example: 'conn_abc123',
  })
  @IsString()
  connectionId!: string;

  @ApiProperty({
    description: 'ID of the integration check being toggled.',
    example: 'aws-s3-bucket-public-access',
  })
  @IsString()
  checkId!: string;
}

@Controller({ path: 'integrations/tasks', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class TaskIntegrationsController {
  private readonly logger = new Logger(TaskIntegrationsController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly checkRunRepository: CheckRunRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly taskIntegrationChecksService: TaskIntegrationChecksService,
  ) {}

  /**
   * Get all integration checks that can auto-complete a specific task template.
   * When a specific `taskId` is also provided, per-task disable state is
   * resolved from the matching connection's metadata so the UI can show
   * which checks have been manually disconnected from that task.
   */
  @Get('template/:templateId/checks')
  @ApiOperation({ summary: 'List checks for a task template' })
  @RequirePermission('integration', 'read')
  async getChecksForTaskTemplate(
    @Param('templateId') templateId: string,
    @OrganizationId() organizationId: string,
    taskIdForDisableState?: string,
  ): Promise<{ checks: TaskIntegrationCheck[] }> {
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

          const isDisabledForTask =
            !!taskIdForDisableState &&
            !!connection &&
            !isTaskCheckEnabled({
              metadata: connection.metadata,
              taskId: taskIdForDisableState,
              checkId: check.id,
              enabledByDefault: isTaskRunEnabledByDefault(check),
            });

          checks.push({
            integrationId: manifest.id,
            integrationName: manifest.name,
            integrationLogoUrl: manifest.logoUrl,
            checkId: check.id,
            checkName: check.name,
            checkDescription: check.description,
            isConnected: !!connection && connection.status === 'active',
            isDisabledForTask,
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
  @ApiOperation({ summary: 'List checks attached to a task' })
  @RequirePermission('integration', 'read')
  async getChecksForTask(
    @Param('taskId') taskId: string,
    @OrganizationId() organizationId: string,
  ): Promise<{
    checks: TaskIntegrationCheck[];
    task: { id: string; title: string; templateId: string | null };
  }> {
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

    // Get checks for this template, annotated with per-task disable state
    const { checks } = await this.getChecksForTaskTemplate(
      task.taskTemplateId,
      organizationId,
      task.id,
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
  @ApiOperation({ summary: 'Run a check for a task' })
  @ApiBody({ type: RunCheckForTaskDto })
  @RequirePermission('integration', 'update')
  async runCheckForTask(
    @Param('taskId') taskId: string,
    @OrganizationId() organizationId: string,
    @Body() body: RunCheckForTaskDto,
  ): Promise<{
    success: boolean;
    error?: string;
    accountsRun?: number;
    totalPassing?: number;
    totalFindings?: number;
    /** True when at least one account could not be checked (e.g. bad creds). */
    hadErrors?: boolean;
    checkRunId?: string;
    taskStatus?: string | null;
  }> {
    const { connectionId, checkId } = body;

    // Verify task exists
    const task = await db.task.findUnique({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    // The UI references one connection, but a customer may have several
    // accounts connected for the same provider (e.g. multiple AWS accounts).
    // Use the referenced connection only to resolve the provider, then run the
    // check against EVERY active account of that provider — matching the
    // scheduler, which already runs each connection. This is why running once
    // checked only the first account.
    const referencedConnection =
      await this.connectionRepository.findById(connectionId);
    if (
      !referencedConnection ||
      referencedConnection.organizationId !== organizationId
    ) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    // Reject inactive connections up front. This also keeps the fallback below
    // safe: it can only ever contain a connection we've verified is active.
    if (referencedConnection.status !== 'active') {
      throw new HttpException(
        'Connection is not active',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = await this.providerRepository.findById(
      referencedConnection.providerId,
    );
    if (!provider) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new HttpException('Manifest not found', HttpStatus.NOT_FOUND);
    }

    const checkDef = manifest.checks?.find((c) => c.id === checkId);
    if (!checkDef) {
      throw new HttpException(
        `Check ${checkId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const activeConnections =
      await this.connectionRepository.findActiveByProviderAndOrg(
        provider.id,
        organizationId,
      );
    // Never run zero accounts: if a status race leaves the active query empty,
    // fall back to the referenced connection (verified active above).
    const connections =
      activeConnections.length > 0 ? activeConnections : [referencedConnection];

    let totalFindings = 0;
    let totalPassing = 0;
    let accountsRun = 0;
    let hasExecutionError = false;
    let lastCheckRunId: string | undefined;
    // Failing findings across all accounts (keyed like an exception) so task
    // status can exclude explicitly-excepted ones below.
    const failingFindings: Array<{
      connectionId: string;
      checkId: string;
      resourceId: string;
    }> = [];

    // Sequential so each per-account run commits as it completes — a slow or
    // failing account still leaves the earlier accounts' results persisted.
    for (const conn of connections) {
      // Respect a check that was disconnected from this task for this account.
      if (
        !isTaskCheckEnabled({
          metadata: conn.metadata,
          taskId,
          checkId,
          enabledByDefault: isTaskRunEnabledByDefault(checkDef),
        })
      ) {
        continue;
      }
      const outcome = await this.runCheckForConnection({
        connection: conn,
        manifest,
        checkDef,
        taskId,
        organizationId,
      });
      accountsRun += 1;
      totalFindings += outcome.findings;
      totalPassing += outcome.passing;
      if (outcome.status === 'error') hasExecutionError = true;
      for (const resourceId of outcome.failingResourceIds) {
        failingFindings.push({ connectionId: conn.id, checkId, resourceId });
      }
      lastCheckRunId = outcome.checkRunId;
    }

    if (accountsRun === 0) {
      throw new HttpException(
        'This check is disconnected from the task. Reconnect it before running.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Aggregate task status across ALL accounts, HONORING active finding
    // exceptions so an explicitly-excepted finding doesn't fail the task —
    // matched with the scheduled run and the Cloud Tests findings view (one
    // rule, via the shared helpers). Any real (non-excepted) finding → failed;
    // else any passing result → done; else leave unchanged.
    const exceptions = await loadActiveExceptionSet(organizationId);
    const effectiveFailures = countEffectiveFailures(
      failingFindings,
      exceptions,
    );
    const newStatus = decideTaskStatus(
      effectiveFailures,
      totalPassing,
      totalFindings,
    );

    if (newStatus) {
      const isTransitioningToDone =
        newStatus === 'done' && task.status !== 'done';

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
        `Updated task ${taskId} status to ${newStatus} across ${accountsRun} account(s)${reviewDate ? `, next review: ${reviewDate.toISOString()}` : ''}`,
      );
    }

    return {
      success: true,
      accountsRun,
      totalPassing,
      totalFindings,
      hadErrors: hasExecutionError,
      checkRunId: lastCheckRunId,
      taskStatus: newStatus,
    };
  }

  /**
   * Run one check against ONE connection (account) and persist the run +
   * results. Resilient: any failure (missing credentials, execution error) is
   * recorded on the check run and returned as an outcome rather than thrown, so
   * a caller looping over multiple accounts is never aborted by one bad
   * account. Does NOT update task status — the caller aggregates across
   * accounts.
   */
  private async runCheckForConnection(params: {
    connection: IntegrationConnection;
    manifest: IntegrationManifest;
    checkDef: IntegrationCheckDef;
    taskId: string;
    organizationId: string;
  }): Promise<ConnectionCheckOutcome> {
    const { connection, manifest, checkDef, taskId, organizationId } = params;
    const connectionId = connection.id;

    // Create the run up front so even an account that fails credential
    // validation still produces a visible (failed) run row for that account.
    const checkRun = await this.checkRunRepository.create({
      connectionId,
      taskId,
      checkId: checkDef.id,
      checkName: checkDef.name,
    });

    try {
      const credentials =
        await this.credentialVaultService.getDecryptedCredentials(connectionId);

      if (
        !credentials ||
        (manifest.auth.type === 'oauth2' && !credentials.access_token) ||
        (manifest.auth.type === 'custom' &&
          Object.keys(credentials).length === 0)
      ) {
        throw new Error(
          'No valid credentials found for this connection. Reconnect the integration.',
        );
      }

      const variables =
        (connection.variables as Record<
          string,
          string | number | boolean | string[] | undefined
        >) || {};

      // Build token refresh callback for OAuth integrations that support it.
      let onTokenRefresh: (() => Promise<string | null>) | undefined;
      if (manifest.auth.type === 'oauth2') {
        const oauthConfig = manifest.auth.config;
        const supportsRefresh = oauthConfig.supportsRefreshToken !== false;
        if (supportsRefresh) {
          const oauthCredentials =
            await this.oauthCredentialsService.getCredentials(
              manifest.id,
              organizationId,
            );
          if (oauthCredentials) {
            onTokenRefresh = async () =>
              this.credentialVaultService.refreshOAuthTokens(connectionId, {
                tokenUrl: oauthConfig.tokenUrl,
                refreshUrl: oauthConfig.refreshUrl,
                clientId: oauthCredentials.clientId,
                clientSecret: oauthCredentials.clientSecret,
                clientAuthMethod: oauthConfig.clientAuthMethod,
                scope: oauthCredentials.scopes.join(' '),
                tokenParams: oauthConfig.tokenParams,
              });
          }
        }
      }

      const accessToken = getStringValue(credentials.access_token);
      const result = await runAllChecks({
        manifest,
        accessToken,
        // Pass decrypted credentials through unchanged. Collapsing array fields
        // here (e.g. AWS `regions`) made custom-auth checks see no regions and
        // skip with "connection not configured".
        credentials,
        variables,
        connectionId,
        organizationId,
        checkId: checkDef.id, // Only run this specific check
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
        return {
          connectionId,
          checkRunId: checkRun.id,
          status: 'error',
          findings: 0,
          passing: 0,
          failingResourceIds: [],
        };
      }

      const resultsToStore = [
        ...checkResult.result.passingResults.map((r) => ({
          checkRunId: checkRun.id,
          passed: true,
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          title: r.title,
          description: r.description,
          evidence: r.evidence as Prisma.InputJsonValue,
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
          evidence: f.evidence as Prisma.InputJsonValue,
        })),
      ];

      if (resultsToStore.length > 0) {
        await this.checkRunRepository.addResults(resultsToStore);
      }

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
        `Check ${checkDef.id} for task ${taskId} (connection ${connectionId}): ${checkResult.status} - ${checkResult.result.findings.length} findings, ${checkResult.result.passingResults.length} passing`,
      );

      return {
        connectionId,
        checkRunId: checkRun.id,
        status: checkResult.status,
        findings: checkResult.result.findings.length,
        passing: checkResult.result.passingResults.length,
        failingResourceIds: checkResult.result.findings.map(
          (f) => f.resourceId,
        ),
      };
    } catch (error) {
      await this.checkRunRepository.complete(checkRun.id, {
        status: 'failed',
        durationMs: checkRun.startedAt
          ? Date.now() - checkRun.startedAt.getTime()
          : 0,
        totalChecked: 0,
        passedCount: 0,
        failedCount: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      this.logger.error(
        `Failed to run check ${checkDef.id} for connection ${connectionId}: ${error}`,
      );
      return {
        connectionId,
        checkRunId: checkRun.id,
        status: 'error',
        findings: 0,
        passing: 0,
        failingResourceIds: [],
      };
    }
  }

  /**
   * Disconnect a single integration check from a specific task.
   * Does not affect the connection itself or any other task that uses the
   * same check. Scheduled runs, manual runs, and the task detail UI will all
   * skip this (task, check) pair until it is reconnected.
   */
  @Post(':taskId/checks/disconnect')
  @ApiOperation({ summary: 'Disconnect checks from a task' })
  @ApiBody({ type: ToggleCheckForTaskDto })
  @RequirePermission('integration', 'update')
  async disconnectCheckFromTask(
    @Param('taskId') taskId: string,
    @OrganizationId() organizationId: string,
    @Body() body: ToggleCheckForTaskDto,
  ): Promise<{ success: true; disabled: true }> {
    await this.taskIntegrationChecksService.disconnectCheckFromTask({
      taskId,
      connectionId: body.connectionId,
      checkId: body.checkId,
      organizationId,
    });
    return { success: true, disabled: true };
  }

  /**
   * Re-enable a previously disconnected integration check for a specific
   * task. Inverse of the disconnect endpoint.
   */
  @Post(':taskId/checks/reconnect')
  @ApiOperation({ summary: 'Reconnect checks to a task' })
  @ApiBody({ type: ToggleCheckForTaskDto })
  @RequirePermission('integration', 'update')
  async reconnectCheckToTask(
    @Param('taskId') taskId: string,
    @OrganizationId() organizationId: string,
    @Body() body: ToggleCheckForTaskDto,
  ): Promise<{ success: true; disabled: false }> {
    await this.taskIntegrationChecksService.reconnectCheckToTask({
      taskId,
      connectionId: body.connectionId,
      checkId: body.checkId,
      organizationId,
    });
    return { success: true, disabled: false };
  }

  /**
   * Get check run history for a task
   */
  @Get(':taskId/runs')
  @ApiOperation({ summary: 'List check runs for a task' })
  @RequirePermission('integration', 'read')
  async getTaskCheckRuns(
    @Param('taskId') taskId: string,
    @OrganizationId() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    // Tenant scoping: confirm the task belongs to the caller's org before
    // returning its check runs. The runs carry account ids, connection labels,
    // and logs — without this an arbitrary taskId would leak cross-tenant data.
    const task = await db.task.findUnique({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    // Latest run per (connection, check) is guaranteed present — so a customer
    // with multiple accounts always sees every account, never just the most
    // recently re-run one. `connectionId` + `connectionLabel` let the UI show
    // which account each run belongs to.
    const runs =
      await this.checkRunRepository.findLatestPerConnectionAndCheckByTask(
        taskId,
        { historyPerGroup: limit ? parseInt(limit, 10) : 5 },
      );

    // Honor active finding exceptions in what the UI shows: a failing result
    // under an active exception is surfaced as `excepted` and excluded from the
    // run's failed count/status — matched with task status + the Cloud Tests
    // findings view (one rule, via the shared exception set). Raw rows are left
    // untouched in the DB; this only affects the response.
    const exceptions = await loadActiveExceptionSet(organizationId);

    return {
      runs: runs.map((run) => {
        const provider = getProviderSummary(run.connection);

        const results = run.results.map((r) => ({
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
          excepted:
            !r.passed &&
            exceptions.has(run.connectionId, run.checkId, r.resourceId),
        }));

        const exceptedCount = results.filter((r) => r.excepted).length;
        const effectiveFailed = Math.max(0, run.failedCount - exceptedCount);
        // Only downgrade failed → success when the failures were actually
        // EXCEPTED. A failed run with no findings (e.g. an execution error,
        // which is persisted as failed with failedCount 0) must stay failed so
        // real runtime errors aren't hidden.
        const displayStatus =
          run.status === 'failed' && effectiveFailed === 0 && exceptedCount > 0
            ? 'success'
            : run.status;

        return {
          id: run.id,
          checkId: run.checkId,
          checkName: run.checkName,
          status: displayStatus,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          durationMs: run.durationMs,
          totalChecked: run.totalChecked,
          passedCount: run.passedCount,
          failedCount: effectiveFailed,
          exceptedCount,
          errorMessage: run.errorMessage,
          logs: run.logs,
          connectionId: run.connectionId,
          connectionLabel: getConnectionLabel(run.connection),
          provider: {
            slug: provider?.slug,
            name: provider?.name,
          },
          results,
          createdAt: run.createdAt,
        };
      }),
    };
  }
}
