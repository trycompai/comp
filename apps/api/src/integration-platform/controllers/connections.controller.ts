import {
  Controller,
  Get,
  Post,
  Put,
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
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';
import { ProviderRepository } from '../repositories/provider.repository';
import {
  getManifest,
  getAllManifests,
  getActiveManifests,
  TASK_TEMPLATE_INFO,
  type OAuthConfig,
  type TaskTemplateId,
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
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly autoCheckRunnerService: AutoCheckRunnerService,
    private readonly providerRepository: ProviderRepository,
  ) {}

  /**
   * List all available integration providers
   */
  @Get('providers')
  async listProviders(@Query('activeOnly') activeOnly?: string) {
    const manifests =
      activeOnly === 'true' ? getActiveManifests() : getAllManifests();

    // Check platform credentials for OAuth providers
    const oauthProviderSlugs = manifests
      .filter((m) => m.auth.type === 'oauth2')
      .map((m) => m.id);

    const platformCredentialsMap = new Map<string, boolean>();
    for (const slug of oauthProviderSlugs) {
      const availability = await this.oauthCredentialsService.checkAvailability(
        slug,
        '', // Empty org ID to just check platform credentials
      );
      platformCredentialsMap.set(slug, availability.hasPlatformCredentials);
    }

    return manifests.map((m) => {
      // Get credential fields - from custom auth config or from manifest
      const credentialFields =
        m.auth.type === 'custom' && m.auth.config.credentialFields
          ? m.auth.config.credentialFields
          : m.credentialFields;

      // Get setup instructions for custom auth
      const setupInstructions =
        m.auth.type === 'custom' ? m.auth.config.setupInstructions : undefined;

      // For OAuth providers, check if platform credentials are configured
      const oauthConfigured =
        m.auth.type === 'oauth2'
          ? (platformCredentialsMap.get(m.id) ?? false)
          : undefined;

      // Get mapped tasks from checks and collect required variables
      const mappedTasks: Array<{ id: string; name: string }> = [];
      const seenTaskIds = new Set<string>();
      const requiredVariables = new Set<string>();

      // Collect manifest-level required variables
      for (const variable of m.variables || []) {
        if (variable.required) {
          requiredVariables.add(variable.id);
        }
      }

      // Collect check-level required variables
      for (const check of m.checks || []) {
        if (check.taskMapping && !seenTaskIds.has(check.taskMapping)) {
          seenTaskIds.add(check.taskMapping);
          const taskInfo = TASK_TEMPLATE_INFO[check.taskMapping];
          if (taskInfo) {
            mappedTasks.push({ id: check.taskMapping, name: taskInfo.name });
          }
        }
        if (check.variables) {
          for (const variable of check.variables) {
            if (variable.required) {
              requiredVariables.add(variable.id);
            }
          }
        }
      }

      return {
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        logoUrl: m.logoUrl,
        authType: m.auth.type,
        capabilities: m.capabilities,
        isActive: m.isActive,
        docsUrl: m.docsUrl,
        credentialFields,
        setupInstructions,
        oauthConfigured,
        mappedTasks,
        requiredVariables: Array.from(requiredVariables),
      };
    });
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

    // Get credential fields - from custom auth config or from manifest
    const credentialFields =
      manifest.auth.type === 'custom' && manifest.auth.config.credentialFields
        ? manifest.auth.config.credentialFields
        : manifest.credentialFields;

    // Get setup instructions for custom auth
    const setupInstructions =
      manifest.auth.type === 'custom'
        ? manifest.auth.config.setupInstructions
        : undefined;

    // Get mapped tasks from checks
    const mappedTasks: Array<{ id: string; name: string }> = [];
    const seenTaskIds = new Set<string>();

    // Collect required variables (manifest-level and check-level)
    const requiredVariables = new Set<string>();

    // Manifest-level variables
    for (const variable of manifest.variables || []) {
      if (variable.required) {
        requiredVariables.add(variable.id);
      }
    }

    // Check-level variables
    for (const check of manifest.checks || []) {
      if (check.taskMapping && !seenTaskIds.has(check.taskMapping)) {
        seenTaskIds.add(check.taskMapping);
        const taskInfo = TASK_TEMPLATE_INFO[check.taskMapping];
        if (taskInfo) {
          mappedTasks.push({ id: check.taskMapping, name: taskInfo.name });
        }
      }
      if (check.variables) {
        for (const variable of check.variables) {
          if (variable.required) {
            requiredVariables.add(variable.id);
          }
        }
      }
    }

    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      category: manifest.category,
      logoUrl: manifest.logoUrl,
      authType: manifest.auth.type,
      capabilities: manifest.capabilities,
      isActive: manifest.isActive,
      docsUrl: manifest.docsUrl,
      credentialFields,
      setupInstructions,
      mappedTasks,
      requiredVariables: Array.from(requiredVariables),
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
    const providerSlug = (connection as { provider?: { slug: string } })
      .provider?.slug;

    // Get credential fields for custom auth integrations
    let credentialFields: Array<{
      id: string;
      label: string;
      type: string;
      required: boolean;
      placeholder?: string;
      helpText?: string;
      options?: Array<{ value: string; label: string }>;
    }> = [];

    if (providerSlug) {
      const manifest = getManifest(providerSlug);
      if (
        manifest?.auth.type === 'custom' &&
        manifest.auth.config.credentialFields
      ) {
        credentialFields = manifest.auth.config.credentialFields;
      }
    }

    return {
      id: connection.id,
      providerId: connection.providerId,
      providerSlug,
      providerName: (connection as { provider?: { name: string } }).provider
        ?.name,
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
      credentialFields,
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

    // Auto-run checks if possible (fire and forget)
    this.autoCheckRunnerService
      .tryAutoRunChecks(connection.id)
      .then((didRun) => {
        if (didRun) {
          this.logger.log(
            `Auto-ran checks for ${providerSlug} after connection created`,
          );
        }
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to auto-run checks after connection: ${err.message}`,
        );
      });

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

  /**
   * Get valid credentials for a connection, refreshing OAuth tokens if needed.
   * Used by scheduled jobs to ensure tokens are valid before running checks.
   */
  @Post(':id/ensure-valid-credentials')
  async ensureValidCredentials(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionService.getConnection(id);

    if (connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.status !== 'active') {
      throw new HttpException(
        'Connection is not active',
        HttpStatus.BAD_REQUEST,
      );
    }

    const providerSlug = (connection as { provider?: { slug: string } })
      .provider?.slug;
    if (!providerSlug) {
      throw new HttpException(
        'Provider not found for connection',
        HttpStatus.NOT_FOUND,
      );
    }

    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Manifest not found for ${providerSlug}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if token needs refresh (for OAuth integrations that support it)
    if (manifest.auth.type === 'oauth2') {
      const oauthConfig = manifest.auth.config;

      // Skip refresh for providers that don't support refresh tokens (e.g., GitHub)
      const supportsRefresh = oauthConfig.supportsRefreshToken !== false;

      if (supportsRefresh) {
        const needsRefresh = await this.credentialVaultService.needsRefresh(id);

        if (needsRefresh) {
          this.logger.log(
            `Token needs refresh for connection ${id}, attempting refresh...`,
          );

          const oauthCredentials =
            await this.oauthCredentialsService.getCredentials(
              providerSlug,
              organizationId,
            );

          if (!oauthCredentials) {
            throw new HttpException(
              'OAuth credentials not configured',
              HttpStatus.BAD_REQUEST,
            );
          }

          const newToken = await this.credentialVaultService.refreshOAuthTokens(
            id,
            {
              tokenUrl: oauthConfig.tokenUrl,
              refreshUrl: oauthConfig.refreshUrl,
              clientId: oauthCredentials.clientId,
              clientSecret: oauthCredentials.clientSecret,
              clientAuthMethod: oauthConfig.clientAuthMethod,
            },
          );

          if (!newToken) {
            // Refresh failed - connection needs to be re-established
            await this.connectionService.setConnectionError(
              id,
              'OAuth token expired and refresh failed. Please reconnect.',
            );
            throw new HttpException(
              'Token refresh failed. Please reconnect the integration.',
              HttpStatus.UNAUTHORIZED,
            );
          }

          this.logger.log(`Successfully refreshed token for connection ${id}`);
        }
      }
    }

    // Get current credentials
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(id);

    if (!credentials) {
      throw new HttpException(
        'No credentials found for connection',
        HttpStatus.BAD_REQUEST,
      );
    }

    // For OAuth, validate access_token exists
    if (manifest.auth.type === 'oauth2' && !credentials.access_token) {
      throw new HttpException(
        'No valid OAuth credentials found. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // For API key auth, validate key exists
    if (manifest.auth.type === 'api_key') {
      const apiKeyField = manifest.auth.config.name;
      if (!credentials[apiKeyField] && !credentials.api_key) {
        throw new HttpException('API key not found', HttpStatus.BAD_REQUEST);
      }
    }

    // For basic auth, validate username and password exist
    if (manifest.auth.type === 'basic') {
      const usernameField = manifest.auth.config.usernameField || 'username';
      const passwordField = manifest.auth.config.passwordField || 'password';
      if (!credentials[usernameField] || !credentials[passwordField]) {
        throw new HttpException(
          'Username and password required',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // For custom auth (like AWS), validate credentials exist
    if (
      manifest.auth.type === 'custom' &&
      Object.keys(credentials).length === 0
    ) {
      throw new HttpException(
        'No valid credentials found for custom integration',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: true,
      accessToken: credentials.access_token ?? undefined,
      credentials,
    };
  }

  /**
   * Update credentials for a custom auth connection
   */
  @Put(':id/credentials')
  async updateCredentials(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() body: { credentials: Record<string, string> },
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionService.getConnection(id);

    if (connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    const providerSlug = (connection as { provider?: { slug: string } })
      .provider?.slug;
    if (!providerSlug) {
      throw new HttpException(
        'Provider not found for connection',
        HttpStatus.NOT_FOUND,
      );
    }

    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Manifest not found for ${providerSlug}`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Only allow updating credentials for non-OAuth integrations
    if (manifest.auth.type === 'oauth2') {
      throw new HttpException(
        'Credential updates are not supported for OAuth integrations. Please disconnect and reconnect to refresh the OAuth token.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Store the new credentials
    await this.credentialVaultService.storeApiKeyCredentials(
      id,
      body.credentials,
    );

    // Reactivate the connection if it was in error state
    if (connection.status === 'error') {
      await this.connectionService.activateConnection(id);
    }

    this.logger.log(`Updated credentials for connection ${id}`);

    // Auto-run checks if possible (fire and forget)
    this.autoCheckRunnerService
      .tryAutoRunChecks(id)
      .then((didRun) => {
        if (didRun) {
          this.logger.log(
            `Auto-ran checks for connection ${id} after credential update`,
          );
        }
      })
      .catch((err) => {
        this.logger.warn(
          `Failed to auto-run checks after credential update: ${err.message}`,
        );
      });

    return { success: true };
  }
}
