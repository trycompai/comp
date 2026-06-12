import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { getManifest, runAllChecks } from '@trycompai/integration-platform';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CredentialVaultService } from './credential-vault.service';
import { OAuthCredentialsService } from './oauth-credentials.service';
import { getStringValue } from '../utils/credential-utils';

export type RunAllChecksResult = Awaited<ReturnType<typeof runAllChecks>>;

/**
 * Runs integration checks for a connection ON OUR SERVER (the API/ECS process)
 * and returns the raw result WITHOUT persisting anything.
 *
 * Why this exists: AWS checks make S3 (and other) API calls that egress the
 * runtime's network. In the Trigger.dev runtime those calls exit Trigger.dev's
 * VPC, whose S3 endpoint policy blocks our cross-account audit reads
 * ("no VPC endpoint policy allows ..."). Running them here egresses OUR VPC,
 * whose endpoint allows the read — identical to the in-app manual "Run".
 *
 * Only the AWS Trigger tasks call this; GCP/Azure/dynamic/legacy integrations
 * keep executing in Trigger.dev unchanged. Persistence + task status + emails
 * stay in the caller, so AWS results are recorded exactly like every other
 * provider's.
 */
@Injectable()
export class ConnectionCheckRunnerService {
  private readonly logger = new Logger(ConnectionCheckRunnerService.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
  ) {}

  /**
   * Run a connection's checks and return the raw `runAllChecks` result.
   * Pass `checkId` to run a single check; omit it to run all of the
   * connection's checks. Does NOT write to the database.
   */
  async runChecks(params: {
    connectionId: string;
    organizationId: string;
    checkId?: string;
  }): Promise<RunAllChecksResult> {
    const { connectionId, organizationId, checkId } = params;

    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection || connection.organizationId !== organizationId) {
      throw new NotFoundException('Connection not found');
    }
    if (connection.status !== 'active') {
      throw new BadRequestException(
        `Connection is not active (status: ${connection.status})`,
      );
    }

    const provider = await this.providerRepository.findById(
      connection.providerId,
    );
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const manifest = getManifest(provider.slug);
    if (!manifest) {
      throw new NotFoundException(`Manifest for ${provider.slug} not found`);
    }
    if (!manifest.checks || manifest.checks.length === 0) {
      throw new BadRequestException(`No checks defined for ${provider.slug}`);
    }

    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);
    if (!credentials) {
      throw new BadRequestException('No credentials found for connection');
    }

    // Validate credentials by auth type, matching the in-app run paths
    // (checks.controller / task-integrations.controller) so a server-run rejects
    // malformed credentials up front with a clear error instead of executing the
    // check on bad input and producing an inconsistent outcome.
    if (manifest.auth.type === 'oauth2' && !credentials.access_token) {
      throw new BadRequestException(
        'No valid OAuth credentials found. Please reconnect.',
      );
    }
    if (manifest.auth.type === 'api_key') {
      const apiKeyField = manifest.auth.config.name;
      if (!credentials[apiKeyField] && !credentials.api_key) {
        throw new BadRequestException(
          'API key not found. Please reconnect the integration.',
        );
      }
    }
    if (manifest.auth.type === 'basic') {
      const usernameField = manifest.auth.config.usernameField || 'username';
      const passwordField = manifest.auth.config.passwordField || 'password';
      if (!credentials[usernameField] || !credentials[passwordField]) {
        throw new BadRequestException(
          'Username and password required. Please reconnect the integration.',
        );
      }
    }
    if (
      manifest.auth.type === 'custom' &&
      Object.keys(credentials).length === 0
    ) {
      throw new BadRequestException(
        'No valid credentials found for custom integration',
      );
    }

    const variables =
      (connection.variables as Record<
        string,
        string | number | boolean | string[] | undefined
      >) || {};

    // Build the OAuth refresh callback for providers that support it. AWS is
    // not oauth2, so this is a no-op for the AWS path that actually uses this.
    let accessToken = getStringValue(credentials.access_token);
    let onTokenRefresh: (() => Promise<string | null>) | undefined;
    if (manifest.auth.type === 'oauth2') {
      const oauthConfig = manifest.auth.config;
      if (oauthConfig.supportsRefreshToken !== false) {
        const oauthCredentials =
          await this.oauthCredentialsService.getCredentials(
            provider.slug,
            organizationId,
          );
        if (oauthCredentials) {
          const refreshConfig = {
            tokenUrl: oauthConfig.tokenUrl,
            refreshUrl: oauthConfig.refreshUrl,
            clientId: oauthCredentials.clientId,
            clientSecret: oauthCredentials.clientSecret,
            clientAuthMethod: oauthConfig.clientAuthMethod,
            scope: oauthCredentials.scopes.join(' '),
            tokenParams: oauthConfig.tokenParams,
          };
          const validAccessToken =
            await this.credentialVaultService.getValidAccessToken(
              connectionId,
              refreshConfig,
            );
          if (validAccessToken) accessToken = validAccessToken;
          onTokenRefresh = () =>
            this.credentialVaultService.refreshOAuthTokens(
              connectionId,
              refreshConfig,
            );
        }
      }
    }

    return runAllChecks({
      manifest,
      accessToken,
      credentials,
      variables,
      connectionId,
      organizationId,
      checkId,
      onTokenRefresh,
      logger: {
        info: (msg, data) => this.logger.log(msg, data),
        warn: (msg, data) => this.logger.warn(msg, data),
        error: (msg, data) => this.logger.error(msg, data),
      },
    });
  }
}
