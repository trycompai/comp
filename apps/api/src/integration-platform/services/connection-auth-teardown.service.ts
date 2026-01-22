import { Injectable, Logger } from '@nestjs/common';
import { CredentialVaultService } from './credential-vault.service';
import { OAuthTokenRevocationService } from './oauth-token-revocation.service';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialRepository } from '../repositories/credential.repository';

@Injectable()
export class ConnectionAuthTeardownService {
  private readonly logger = new Logger(ConnectionAuthTeardownService.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly credentialRepository: CredentialRepository,
    private readonly oauthTokenRevocationService: OAuthTokenRevocationService,
  ) {}

  /**
   * Best-effort teardown of a connection's auth:
   * - Revoke provider token if supported/configured
   * - Delete all stored credential versions
   * - Clear active credential pointer
   */
  async teardown({ connectionId }: { connectionId: string }): Promise<void> {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) return;

    const providerSlug = (connection as { provider?: { slug: string } })
      .provider?.slug;

    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);
    const accessToken = credentials?.access_token;

    if (providerSlug && accessToken) {
      try {
        await this.oauthTokenRevocationService.revokeAccessToken({
          providerSlug,
          accessToken,
          organizationId: connection.organizationId,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to revoke OAuth token for ${providerSlug} connection ${connectionId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    try {
      await this.credentialRepository.deleteAllByConnection(connectionId);
    } catch (error) {
      this.logger.warn(
        `Failed deleting credential versions for connection ${connectionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      await this.connectionRepository.update(connectionId, {
        activeCredentialVersionId: null,
      });
    } catch (error) {
      this.logger.warn(
        `Failed clearing active credential pointer for connection ${connectionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
