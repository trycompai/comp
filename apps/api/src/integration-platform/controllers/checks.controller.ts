import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  getManifest,
  getAvailableChecks,
  runAllChecks,
} from '@comp/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';

interface RunChecksDto {
  checkId?: string;
}

@Controller({ path: 'integrations/checks', version: '1' })
export class ChecksController {
  private readonly logger = new Logger(ChecksController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly checkRunRepository: CheckRunRepository,
  ) {}

  /**
   * List available checks for a provider
   */
  @Get('providers/:providerSlug')
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
  async listConnectionChecks(@Param('connectionId') connectionId: string) {
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
  async runConnectionChecks(
    @Param('connectionId') connectionId: string,
    @Body() body: RunChecksDto,
  ) {
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
      const result = await runAllChecks({
        manifest,
        accessToken: credentials.access_token ?? undefined,
        credentials: credentials,
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

      // Update the check run status
      const startTime = checkRun.startedAt?.getTime() || Date.now();
      await this.checkRunRepository.complete(checkRun.id, {
        status: result.totalFindings > 0 ? 'failed' : 'success',
        durationMs: Date.now() - startTime,
        totalChecked: result.results.length,
        passedCount: result.totalPassing,
        failedCount: result.totalFindings,
      });

      return {
        connectionId,
        providerSlug: provider.slug,
        checkRunId: checkRun.id,
        ...result,
      };
    } catch (error) {
      // Mark the check run as failed
      const startTime = checkRun.startedAt?.getTime() || Date.now();
      await this.checkRunRepository.complete(checkRun.id, {
        status: 'failed',
        durationMs: Date.now() - startTime,
        totalChecked: 0,
        passedCount: 0,
        failedCount: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      this.logger.error(`Check execution failed: ${error}`);
      throw new HttpException(
        `Check execution failed: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Run a specific check for a connection
   */
  @Post('connections/:connectionId/run/:checkId')
  async runSingleCheck(
    @Param('connectionId') connectionId: string,
    @Param('checkId') checkId: string,
  ) {
    return this.runConnectionChecks(connectionId, { checkId });
  }
}
