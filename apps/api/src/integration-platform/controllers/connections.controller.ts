import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConnectionService } from '../services/connection.service';
import { CredentialVaultService } from '../services/credential-vault.service';
import { ProviderRepository } from '../repositories/provider.repository';
import {
  getManifest,
  getAllManifests,
  getActiveManifests,
  type IntegrationManifest,
} from '@comp/integration-platform';

interface CreateConnectionDto {
  providerSlug: string;
  organizationId: string;
  credentials?: Record<string, string>;
}

interface ListConnectionsQuery {
  organizationId: string;
}

@Controller({ path: 'integrations/connections', version: '1' })
export class ConnectionsController {
  private readonly logger = new Logger(ConnectionsController.name);

  constructor(
    private readonly connectionService: ConnectionService,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly providerRepository: ProviderRepository,
  ) {}

  /**
   * List all available integration providers
   */
  @Get('providers')
  async listProviders(@Query('activeOnly') activeOnly?: string) {
    const manifests =
      activeOnly === 'true' ? getActiveManifests() : getAllManifests();

    return manifests.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      authType: m.auth.type,
      capabilities: m.capabilities,
      isActive: m.isActive,
      docsUrl: m.docsUrl,
    }));
  }

  /**
   * Get a specific provider's details
   */
  @Get('providers/:slug')
  async getProvider(@Param('slug') slug: string) {
    const manifest = getManifest(slug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${slug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      category: manifest.category,
      authType: manifest.auth.type,
      capabilities: manifest.capabilities,
      isActive: manifest.isActive,
      docsUrl: manifest.docsUrl,
      credentialFields: manifest.credentialFields,
      sync: manifest.sync,
    };
  }

  /**
   * List connections for an organization
   */
  @Get()
  async listConnections(@Query() query: ListConnectionsQuery) {
    const { organizationId } = query;

    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connections =
      await this.connectionService.getOrganizationConnections(organizationId);

    return connections.map((c) => ({
      id: c.id,
      providerId: c.providerId,
      providerSlug: (c as any).provider?.slug,
      providerName: (c as any).provider?.name,
      status: c.status,
      authStrategy: c.authStrategy,
      lastSyncAt: c.lastSyncAt,
      nextSyncAt: c.nextSyncAt,
      errorMessage: c.errorMessage,
      variables: c.variables,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Get a specific connection
   */
  @Get(':id')
  async getConnection(@Param('id') id: string) {
    const connection = await this.connectionService.getConnection(id);

    return {
      id: connection.id,
      providerId: connection.providerId,
      providerSlug: (connection as any).provider?.slug,
      providerName: (connection as any).provider?.name,
      status: connection.status,
      authStrategy: connection.authStrategy,
      lastSyncAt: connection.lastSyncAt,
      nextSyncAt: connection.nextSyncAt,
      syncCadence: connection.syncCadence,
      metadata: connection.metadata,
      variables: connection.variables,
      errorMessage: connection.errorMessage,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Create a new connection with API key credentials
   */
  @Post()
  async createConnection(@Body() body: CreateConnectionDto) {
    const { providerSlug, organizationId, credentials } = body;

    // Validate provider
    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${providerSlug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // For OAuth providers, redirect to OAuth flow
    if (manifest.auth.type === 'oauth2') {
      throw new HttpException(
        'Use /integrations/oauth/start for OAuth providers',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Ensure provider exists in DB
    await this.providerRepository.upsert({
      slug: manifest.id,
      name: manifest.name,
      category: manifest.category,
      capabilities: manifest.capabilities,
      isActive: manifest.isActive,
    });

    // Create connection
    const connection = await this.connectionService.createConnection({
      providerSlug,
      organizationId,
      authStrategy: manifest.auth.type,
    });

    // Store credentials if provided
    if (credentials && Object.keys(credentials).length > 0) {
      await this.credentialVaultService.storeApiKeyCredentials(
        connection.id,
        credentials,
      );
    }

    this.logger.log(
      `Created connection for ${providerSlug}, org: ${organizationId}`,
    );

    return {
      id: connection.id,
      providerId: connection.providerId,
      status: connection.status,
      authStrategy: connection.authStrategy,
      createdAt: connection.createdAt,
    };
  }

  /**
   * Test a connection's credentials
   */
  @Post(':id/test')
  async testConnection(@Param('id') id: string) {
    const connection = await this.connectionService.getConnection(id);
    const providerSlug = (connection as any).provider?.slug;

    if (!providerSlug) {
      throw new HttpException(
        'Provider not found for connection',
        HttpStatus.NOT_FOUND,
      );
    }

    const manifest = getManifest(providerSlug);
    if (!manifest?.handler?.testConnection) {
      throw new HttpException(
        `Provider ${providerSlug} does not support connection testing`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get credentials
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connection.id);
    if (!credentials) {
      throw new HttpException(
        'No credentials found for connection',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const isValid = await manifest.handler.testConnection(credentials);

      if (isValid) {
        await this.connectionService.activateConnection(connection.id);
        return { success: true, message: 'Connection test successful' };
      } else {
        await this.connectionService.setConnectionError(
          connection.id,
          'Connection test failed',
        );
        return { success: false, message: 'Connection test failed' };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Connection test failed';
      await this.connectionService.setConnectionError(
        connection.id,
        errorMessage,
      );
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Pause a connection
   */
  @Post(':id/pause')
  async pauseConnection(@Param('id') id: string) {
    const connection = await this.connectionService.pauseConnection(id);
    return { id: connection.id, status: connection.status };
  }

  /**
   * Resume a paused connection
   */
  @Post(':id/resume')
  async resumeConnection(@Param('id') id: string) {
    const connection = await this.connectionService.activateConnection(id);
    return { id: connection.id, status: connection.status };
  }

  /**
   * Disconnect (soft delete) a connection
   */
  @Post(':id/disconnect')
  async disconnectConnection(@Param('id') id: string) {
    const connection = await this.connectionService.disconnectConnection(id);
    return { id: connection.id, status: connection.status };
  }

  /**
   * Delete a connection permanently
   */
  @Delete(':id')
  async deleteConnection(@Param('id') id: string) {
    await this.connectionService.deleteConnection(id);
    return { success: true };
  }
}
