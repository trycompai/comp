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
  getManifest,
  getAvailableChecks,
  runAllChecks,
  runCheck,
} from '@comp/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { ProviderRepository } from '../repositories/provider.repository';

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

    const provider = await this.providerRepository.findById(connection.providerId);
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

    const provider = await this.providerRepository.findById(connection.providerId);
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

    if (!credentials || !credentials.access_token) {
      throw new HttpException(
        'No valid credentials found for connection',
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

    try {
      // Run checks
      const result = await runAllChecks({
        manifest,
        accessToken: credentials.access_token,
        credentials: credentials as Record<string, string>,
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

      return {
        connectionId,
        providerSlug: provider.slug,
        ...result,
      };
    } catch (error) {
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

