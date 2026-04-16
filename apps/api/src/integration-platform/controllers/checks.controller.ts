import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import type { Prisma } from '@db';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import {
  getManifest,
  getAvailableChecks,
  runAllChecks,
} from '@trycompai/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ConnectionService } from '../services/connection.service';
import { CredentialVaultService } from '../services/credential-vault.service';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { getStringValue, toStringCredentials } from '../utils/credential-utils';

interface RunChecksDto {
  checkId?: string;
}

@Controller({ path: 'integrations/checks', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class ChecksController {
  private readonly logger = new Logger(ChecksController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly checkRunRepository: CheckRunRepository,
    private readonly connectionService: ConnectionService,
  ) {}

  /**
   * List available checks for a provider
   */
  @Get('providers/:providerSlug')
  @ApiOperation({ summary: 'List check definitions for a provider' })
  @RequirePermission('integration', 'read')
  async listProviderChecks(@Param('providerSlug') providerSlug: string) {
    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${providerSlug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      providerSlug,
      providerName: manifest.name,
      checks: getAvailableChecks(manifest),
    };
  }

  /**
   * List available checks for a connection
   */
  @Get('connections/:connectionId')
  @ApiOperation({ summary: 'List checks for a connection' })
  @RequirePermission('integration', 'read')
  async listConnectionChecks(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    await this.connectionService.getConnectionForOrg(
      connectionId,
      organizationId,
    );
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    const provider = await this.providerRepository.findById(
      connection.providerId,
    );
    if (!provider) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new HttpException(
        `Manifest for ${provider.slug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      connectionId,
      providerSlug: provider.slug,
      providerName: manifest.name,
      connectionStatus: connection.status,
      checks: getAvailableChecks(manifest),
    };
  }

  /**
   * Run checks for a connection
   */
  @Post('connections/:connectionId/run')
  @ApiOperation({ summary: 'Run all checks for a connection' })
  @RequirePermission('integration', 'update')
  async runConnectionChecks(
    @Param('connectionId') connectionId: string,
    @Body() body: RunChecksDto,
    @OrganizationId() organizationId: string,
  ) {
    await this.connectionService.getConnectionForOrg(
      connectionId,
      organizationId,
    );
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.status !== 'active') {
      throw new HttpException(
        `Connection is not active (status: ${connection.status})`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = await this.providerRepository.findById(
      connection.providerId,
    );
    if (!provider) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new HttpException(
        `Manifest for ${provider.slug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!manifest.checks || manifest.checks.length === 0) {
      throw new HttpException(
        `No checks defined for ${provider.slug}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get decrypted credentials
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);

    if (!credentials) {
      throw new HttpException(
        'No credentials found for connection',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate credentials based on auth type
    if (manifest.auth.type === 'oauth2' && !credentials.access_token) {
      throw new HttpException(
        'No valid OAuth credentials found. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (manifest.auth.type === 'api_key') {
      const apiKeyField = manifest.auth.config.name;
      if (!credentials[apiKeyField] && !credentials.api_key) {
        throw new HttpException(
          'API key not found. Please reconnect the integration.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (manifest.auth.type === 'basic') {
      const usernameField = manifest.auth.config.usernameField || 'username';
      const passwordField = manifest.auth.config.passwordField || 'password';
      if (!credentials[usernameField] || !credentials[passwordField]) {
        throw new HttpException(
          'Username and password required. Please reconnect the integration.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (
      manifest.auth.type === 'custom' &&
      Object.keys(credentials).length === 0
    ) {
      throw new HttpException(
        'No valid credentials found for custom integration',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get user-configured variables
    const variables =
      (connection.variables as Record<
        string,
        string | number | boolean | string[] | undefined
      >) || {};

    this.logger.log(
      `Running checks for connection ${connectionId} (${provider.slug})${body.checkId ? ` - check: ${body.checkId}` : ''}`,
    );

    // Create a check run record
    const checkRun = await this.checkRunRepository.create({
      connectionId,
      checkId: body.checkId || 'all',
      checkName: body.checkId || 'All Checks',
    });

    try {
      // Run checks
      const accessToken = getStringValue(credentials.access_token);
      const stringCredentials = toStringCredentials(credentials);
      const result = await runAllChecks({
        manifest,
        accessToken,
        credentials: stringCredentials,
        variables,
        connectionId,
        organizationId: connection.organizationId,
        checkId: body.checkId,
        logger: {
          info: (msg, data) => this.logger.log(msg, data),
          warn: (msg, data) => this.logger.warn(msg, data),
          error: (msg, data) => this.logger.error(msg, data),
        },
      });

      this.logger.log(
        `Checks completed for ${connectionId}: ${result.totalFindings} findings, ${result.totalPassing} passing`,
      );

      // Store all results (findings and passing)
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
        await this.checkRunRepository.addResults(resultsToStore);
      }

      // Collect execution logs from all check results
      const allLogs = result.results.flatMap((checkResult) =>
        checkResult.result.logs.map((log) => ({
          check: checkResult.checkName,
          level: log.level,
          message: log.message,
          ...(log.data ? { data: log.data } : {}),
          timestamp: log.timestamp.toISOString(),
        })),
      );

      // Update the check run status with logs
      const startTime = checkRun.startedAt?.getTime() || Date.now();
      await this.checkRunRepository.complete(checkRun.id, {
        status: result.totalFindings > 0 ? 'failed' : 'success',
        durationMs: Date.now() - startTime,
        totalChecked: result.results.length,
        passedCount: result.totalPassing,
        failedCount: result.totalFindings,
        logs:
          allLogs.length > 0
            ? (allLogs as unknown as Prisma.InputJsonValue)
            : undefined,
      });

      return {
        connectionId,
        providerSlug: provider.slug,
        checkRunId: checkRun.id,
        ...result,
      };
    } catch (error) {
      // Mark the check run as failed with error details
      const startTime = checkRun.startedAt?.getTime() || Date.now();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      await this.checkRunRepository.complete(checkRun.id, {
        status: 'failed',
        durationMs: Date.now() - startTime,
        totalChecked: 0,
        passedCount: 0,
        failedCount: 0,
        errorMessage,
        logs: [
          {
            check: body.checkId || 'all',
            level: 'error',
            message: errorMessage,
            ...(errorStack ? { data: { stack: errorStack } } : {}),
            timestamp: new Date().toISOString(),
          },
        ] as unknown as Prisma.InputJsonValue,
      });

      this.logger.error(`Check execution failed: ${error}`);
      throw new HttpException(
        `Check execution failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Run a specific check for a connection
   */
  @Post('connections/:connectionId/run/:checkId')
  @ApiOperation({ summary: 'Run a single check on a connection' })
  @RequirePermission('integration', 'update')
  async runSingleCheck(
    @Param('connectionId') connectionId: string,
    @Param('checkId') checkId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.runConnectionChecks(connectionId, { checkId }, organizationId);
  }
}
