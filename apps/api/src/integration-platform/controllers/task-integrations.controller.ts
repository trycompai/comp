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
} from '@comp/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { db } from '@db';
import type { Prisma } from '@prisma/client';

interface TaskIntegrationCheck {
  integrationId: string;
  integrationName: string;
  checkId: string;
  checkName: string;
  checkDescription: string;
  isConnected: boolean;
  connectionId?: string;
  connectionStatus?: string;
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed' | 'error';
  lastRunFindings?: number;
  lastRunPassing?: number;
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

          checks.push({
            integrationId: manifest.id,
            integrationName: manifest.name,
            checkId: check.id,
            checkName: check.name,
            checkDescription: check.description,
            isConnected: !!connection && connection.status === 'active',
            connectionId: connection?.id,
            connectionStatus: connection?.status,
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
  ): Promise<{ checks: TaskIntegrationCheck[]; task: { id: string; title: string; templateId: string | null } }> {
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
    if (!credentials?.access_token) {
      throw new HttpException(
        'No valid credentials found',
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
      throw new HttpException(`Check ${checkId} not found`, HttpStatus.NOT_FOUND);
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
        accessToken: credentials.access_token,
        credentials: credentials as Record<string, string>,
        variables,
        connectionId,
        organizationId,
        checkId, // Only run this specific check
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
          severity: f.severity as 'info' | 'low' | 'medium' | 'high' | 'critical',
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
        totalChecked: checkResult.result.summary?.totalChecked || 
          checkResult.result.passingResults.length + checkResult.result.findings.length,
        passedCount: checkResult.result.passingResults.length,
        failedCount: checkResult.result.findings.length,
        errorMessage: checkResult.error,
        logs: JSON.parse(JSON.stringify(checkResult.result.logs)) as Prisma.InputJsonValue,
      });

      this.logger.log(
        `Check ${checkId} for task ${taskId}: ${checkResult.status} - ${checkResult.result.findings.length} findings, ${checkResult.result.passingResults.length} passing`,
      );

      return {
        success: true,
        result: checkResult,
        checkRunId: checkRun.id,
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

