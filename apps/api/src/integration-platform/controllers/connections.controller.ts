import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import {
  DescribeHubCommand,
  SecurityHubClient,
} from '@aws-sdk/client-securityhub';
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
  type IntegrationCredentials,
} from '@comp/integration-platform';

interface CreateConnectionDto {
  providerSlug: string;
  organizationId: string;
  credentials?: Record<string, string | string[]>;
}

interface ListConnectionsQuery {
  organizationId: string;
}

const hasCredentialValue = (value?: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return typeof value === 'string' && value.trim().length > 0;
};

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
        supportsMultipleConnections: m.supportsMultipleConnections ?? false,
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
      metadata: c.metadata,
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

    // ============================================================
    // VALIDATE BEFORE CREATING - For AWS, check IAM role + Security Hub
    // ============================================================
    if (providerSlug === 'aws' && credentials) {
      const validationResult = await this.validateAwsCredentials(credentials);
      if (!validationResult.success) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: validationResult.message,
            error: 'Validation Failed',
            details: validationResult.details,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      this.logger.log('AWS credentials validated successfully');
    }

    // Ensure provider exists in DB
    await this.providerRepository.upsert({
      slug: manifest.id,
      name: manifest.name,
      category: manifest.category,
      capabilities: manifest.capabilities,
      isActive: manifest.isActive,
    });

    // Extract metadata from credentials for display purposes
    // These fields are also stored encrypted in credentials, but we need them in metadata for quick access
    const metadata: Record<string, unknown> = {};
    if (credentials) {
      if (typeof credentials.connectionName === 'string') {
        metadata.connectionName = credentials.connectionName;
      }
      if (Array.isArray(credentials.regions)) {
        metadata.regions = credentials.regions;
      }
      // Store roleArn and externalId in metadata for pre-filling the configure form
      // These are not secrets - roleArn is visible in AWS console, externalId is typically the org ID
      if (typeof credentials.roleArn === 'string') {
        metadata.roleArn = credentials.roleArn;
        // Extract account ID from ARN: arn:aws:iam::123456789012:role/RoleName
        const arnMatch = credentials.roleArn.match(
          /^arn:aws:iam::(\d{12}):role\/.+$/,
        );
        if (arnMatch) {
          metadata.accountId = arnMatch[1];
        }
      }
      if (typeof credentials.externalId === 'string') {
        metadata.externalId = credentials.externalId;
      }
    }

    // Create connection (only after validation passes)
    const connection = await this.connectionService.createConnection({
      providerSlug,
      organizationId,
      authStrategy: manifest.auth.type,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    // Store credentials if provided
    if (credentials && Object.keys(credentials).length > 0) {
      await this.credentialVaultService.storeApiKeyCredentials(
        connection.id,
        credentials,
      );
    }

    // Mark connection as active since validation already passed
    await this.connectionService.activateConnection(connection.id);

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
      status: 'active', // We already activated it
      authStrategy: connection.authStrategy,
      createdAt: connection.createdAt,
    };
  }

  /**
   * Validate AWS credentials (IAM role + Security Hub) WITHOUT creating a connection
   */
  private async validateAwsCredentials(
    credentials: Record<string, string | string[]>,
  ): Promise<{ success: boolean; message: string; details?: unknown }> {
    // Validate types before using values
    const roleArnValue = credentials.roleArn;
    const externalIdValue = credentials.externalId;
    const regionsValue = credentials.regions;

    if (typeof roleArnValue !== 'string' || !roleArnValue.trim()) {
      return { success: false, message: 'Missing or invalid IAM Role ARN' };
    }
    if (typeof externalIdValue !== 'string' || !externalIdValue.trim()) {
      return { success: false, message: 'Missing or invalid External ID' };
    }
    if (!Array.isArray(regionsValue) || regionsValue.length === 0) {
      return { success: false, message: 'No AWS regions selected' };
    }

    // Now we have validated types
    const roleArn = roleArnValue.trim();
    const externalId = externalIdValue.trim();
    const regions = regionsValue.filter(
      (r): r is string => typeof r === 'string' && r.trim() !== '',
    );

    if (regions.length === 0) {
      return { success: false, message: 'No valid AWS regions selected' };
    }

    // Validate ARN format
    const arnMatch = roleArn.match(/^arn:aws:iam::(\d{12}):role\/.+$/);
    if (!arnMatch) {
      return {
        success: false,
        message:
          'Invalid IAM Role ARN format. Expected: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME',
      };
    }

    const roleAssumerArn = process.env.SECURITY_HUB_ROLE_ASSUMER_ARN;
    if (!roleAssumerArn) {
      this.logger.error(
        'Missing SECURITY_HUB_ROLE_ASSUMER_ARN environment variable',
      );
      return {
        success: false,
        message: 'Server configuration error - contact support',
      };
    }

    const primaryRegion = regions[0];

    try {
      // Step 1: Assume our role assumer role
      this.logger.log('Validating AWS: Assuming role assumer...');
      const baseSts = new STSClient({ region: primaryRegion });
      const roleAssumerResp = await baseSts.send(
        new AssumeRoleCommand({
          RoleArn: roleAssumerArn,
          RoleSessionName: 'CompValidation',
          DurationSeconds: 900,
        }),
      );

      const roleAssumerCreds = roleAssumerResp.Credentials;
      if (!roleAssumerCreds?.AccessKeyId || !roleAssumerCreds.SecretAccessKey) {
        throw new Error(
          'Failed to assume role assumer - no credentials returned',
        );
      }

      // Step 2: Assume the customer's role
      this.logger.log(`Validating AWS: Assuming customer role ${roleArn}...`);
      const roleAssumerSts = new STSClient({
        region: primaryRegion,
        credentials: {
          accessKeyId: roleAssumerCreds.AccessKeyId,
          secretAccessKey: roleAssumerCreds.SecretAccessKey,
          sessionToken: roleAssumerCreds.SessionToken,
        },
      });

      const customerResp = await roleAssumerSts.send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          ExternalId: externalId,
          RoleSessionName: 'CompValidation',
          DurationSeconds: 900,
        }),
      );

      const customerCreds = customerResp.Credentials;
      if (!customerCreds?.AccessKeyId || !customerCreds.SecretAccessKey) {
        throw new Error(
          'Failed to assume customer role - no credentials returned',
        );
      }

      this.logger.log(
        'Validating AWS: Role assumption successful, checking Security Hub...',
      );

      // Step 3: Check Security Hub in each region
      const awsCredentials = {
        accessKeyId: customerCreds.AccessKeyId,
        secretAccessKey: customerCreds.SecretAccessKey,
        sessionToken: customerCreds.SessionToken,
      };

      const regionResults: {
        region: string;
        enabled: boolean;
        error?: string;
      }[] = [];

      for (const region of regions) {
        try {
          const securityHub = new SecurityHubClient({
            region,
            credentials: awsCredentials,
          });

          await securityHub.send(new DescribeHubCommand({}));
          regionResults.push({ region, enabled: true });
          this.logger.log(`Security Hub is enabled in ${region}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (
            errorMessage.includes('not subscribed') ||
            errorMessage.includes('InvalidAccessException')
          ) {
            regionResults.push({
              region,
              enabled: false,
              error: 'Security Hub not enabled',
            });
            this.logger.warn(`Security Hub not enabled in ${region}`);
          } else if (errorMessage.includes('AccessDenied')) {
            regionResults.push({
              region,
              enabled: false,
              error: 'Access denied - check IAM permissions',
            });
          } else {
            regionResults.push({ region, enabled: false, error: errorMessage });
          }
        }
      }

      // Check if ALL regions have Security Hub enabled
      const failedRegions = regionResults.filter((r) => !r.enabled);

      if (failedRegions.length > 0) {
        const failedRegionNames = failedRegions.map((r) => r.region).join(', ');
        const errorMsg =
          failedRegions.length === 1
            ? `Security Hub is not enabled in region: ${failedRegionNames}. Please enable Security Hub in this region or remove it from your selection.`
            : `Security Hub is not enabled in ${failedRegions.length} regions: ${failedRegionNames}. Please enable Security Hub in these regions or remove them from your selection.`;

        return {
          success: false,
          message: errorMsg,
          details: { regions: regionResults },
        };
      }

      // All validations passed!
      const message =
        regions.length === 1
          ? `Validated! Security Hub is enabled in ${regions[0]}.`
          : `Validated! Security Hub is enabled in all ${regions.length} regions.`;

      return {
        success: true,
        message,
        details: { regions: regionResults },
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Validation failed';

      // Provide user-friendly error messages
      let friendlyMessage = errorMessage;
      if (
        errorMessage.includes('is not authorized to perform: sts:AssumeRole')
      ) {
        friendlyMessage = `Cannot assume the IAM role. Please verify: (1) The Role ARN is correct, (2) The trust policy allows our role assumer (${roleAssumerArn}), (3) The External ID matches exactly.`;
      } else if (errorMessage.includes('AccessDenied')) {
        friendlyMessage =
          'Access denied. Please check that your IAM role has the required permissions (SecurityAudit policy).';
      } else if (errorMessage.includes('InvalidIdentityToken')) {
        friendlyMessage =
          'Invalid credentials. Please check your IAM role configuration.';
      }

      this.logger.error(`AWS validation failed: ${errorMessage}`);
      return { success: false, message: friendlyMessage };
    }
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

    // Get credentials
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connection.id);
    if (!credentials) {
      throw new HttpException(
        'No credentials found for connection',
        HttpStatus.BAD_REQUEST,
      );
    }

    // AWS-specific validation
    if (providerSlug === 'aws') {
      return this.testAwsConnection(connection.id, credentials);
    }

    // For other providers, use the manifest handler
    const manifest = getManifest(providerSlug);
    if (!manifest?.handler?.testConnection) {
      // No handler defined - just activate the connection
      await this.connectionService.activateConnection(connection.id);
      return { success: true, message: 'Connection activated' };
    }

    try {
      const isValid = await manifest.handler.testConnection(
        credentials as IntegrationCredentials,
      );

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
   * Test AWS connection by validating and updating connection status
   */
  private async testAwsConnection(
    connectionId: string,
    credentials: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string; details?: unknown }> {
    // Use the shared validation method
    const result = await this.validateAwsCredentials(
      credentials as Record<string, string | string[]>,
    );

    // Update connection status based on validation result
    if (result.success) {
      await this.connectionService.activateConnection(connectionId);
    } else {
      await this.connectionService.setConnectionError(
        connectionId,
        result.message,
      );
    }

    return result;
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
   * Update connection metadata (connectionName, regions, etc.)
   */
  @Patch(':id')
  async updateConnection(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() body: { metadata?: Record<string, unknown> },
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionService.getConnection(id);
    if (connection.organizationId !== organizationId) {
      throw new HttpException(
        'Connection does not belong to this organization',
        HttpStatus.FORBIDDEN,
      );
    }

    if (body.metadata && Object.keys(body.metadata).length > 0) {
      // Merge with existing metadata
      const existingMetadata = (connection.metadata || {}) as Record<
        string,
        unknown
      >;
      const updatedMetadata = { ...existingMetadata, ...body.metadata };

      await this.connectionService.updateConnectionMetadata(
        id,
        updatedMetadata,
      );
    }

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
    const accessToken =
      typeof credentials.access_token === 'string'
        ? credentials.access_token
        : undefined;

    if (manifest.auth.type === 'oauth2' && !accessToken) {
      throw new HttpException(
        'No valid OAuth credentials found. Please reconnect.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // For API key auth, validate key exists
    if (manifest.auth.type === 'api_key') {
      const apiKeyField = manifest.auth.config.name;
      if (
        !hasCredentialValue(credentials[apiKeyField]) &&
        !hasCredentialValue(credentials.api_key)
      ) {
        throw new HttpException('API key not found', HttpStatus.BAD_REQUEST);
      }
    }

    // For basic auth, validate username and password exist
    if (manifest.auth.type === 'basic') {
      const usernameField = manifest.auth.config.usernameField || 'username';
      const passwordField = manifest.auth.config.passwordField || 'password';
      if (
        !hasCredentialValue(credentials[usernameField]) ||
        !hasCredentialValue(credentials[passwordField])
      ) {
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
      accessToken,
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
    @Body() body: { credentials: Record<string, string | string[]> },
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

    // For AWS, validate credentials BEFORE saving
    if (providerSlug === 'aws') {
      // Merge with existing credentials for fields not being updated
      const existingCredentials =
        await this.credentialVaultService.getDecryptedCredentials(id);
      const mergedCredentials = {
        ...existingCredentials,
        ...body.credentials,
      } as Record<string, string | string[]>;

      const validationResult =
        await this.validateAwsCredentials(mergedCredentials);
      if (!validationResult.success) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: validationResult.message,
            error: 'Validation Failed',
            details: validationResult.details,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      this.logger.log('AWS credentials validated successfully for update');
    }

    // Store the new credentials (only after validation passes)
    await this.credentialVaultService.storeApiKeyCredentials(
      id,
      body.credentials,
    );

    // Only activate the connection if it was in error state (don't resume paused connections)
    if (connection.status === 'error') {
      await this.connectionService.activateConnection(id);
      this.logger.log(
        `Activated connection ${id} after credential update (was in error state)`,
      );
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
