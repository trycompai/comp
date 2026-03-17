import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CredentialVaultService } from './credential-vault.service';
import { OAuthCredentialsService } from './oauth-credentials.service';
import {
  getManifest,
  type RampUser,
  type RampUserStatus,
  type RampUsersResponse,
} from '@trycompai/integration-platform';

const MAX_RETRIES = 3;
const RAMP_USERS_URL = 'https://demo-api.ramp.com/developer/v1/users';

@Injectable()
export class RampApiService {
  private readonly logger = new Logger(RampApiService.name);

  constructor(
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
  ) {}

  /**
   * Get a valid Ramp access token, refreshing if needed.
   */
  async getAccessToken(
    connectionId: string,
    organizationId: string,
  ): Promise<string> {
    let credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);

    if (!credentials?.access_token) {
      throw new HttpException(
        'No valid credentials found. Please reconnect the integration.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const manifest = getManifest('ramp');
    const oauthConfig =
      manifest?.auth.type === 'oauth2' ? manifest.auth.config : null;

    if (oauthConfig?.supportsRefreshToken && credentials.refresh_token) {
      try {
        const oauthCreds = await this.oauthCredentialsService.getCredentials(
          'ramp',
          organizationId,
        );

        if (oauthCreds) {
          const newToken = await this.credentialVaultService.refreshOAuthTokens(
            connectionId,
            {
              tokenUrl: oauthConfig.tokenUrl,
              refreshUrl: oauthConfig.refreshUrl,
              clientId: oauthCreds.clientId,
              clientSecret: oauthCreds.clientSecret,
              clientAuthMethod: oauthConfig.clientAuthMethod,
            },
          );
          if (newToken) {
            credentials =
              await this.credentialVaultService.getDecryptedCredentials(connectionId);
            if (!credentials?.access_token) {
              throw new Error('Failed to get refreshed credentials');
            }
            this.logger.log('Successfully refreshed Ramp OAuth token');
          }
        }
      } catch (refreshError) {
        this.logger.warn(
          `Token refresh failed, trying with existing token: ${refreshError}`,
        );
      }
    }

    if (!credentials?.access_token) {
      throw new HttpException(
        'No valid credentials found. Please reconnect the integration.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = credentials.access_token;
    return Array.isArray(token) ? token[0] : token;
  }

  /**
   * Fetch all Ramp users with pagination, retry, and rate-limit handling.
   * Optionally filter by status.
   */
  async fetchUsers(
    accessToken: string,
    status?: RampUserStatus,
  ): Promise<RampUser[]> {
    const users: RampUser[] = [];
    let nextUrl: string | null = null;

    try {
      do {
        const url = nextUrl
          ? new URL(nextUrl)
          : new URL(RAMP_USERS_URL);
        if (!nextUrl) {
          url.searchParams.set('page_size', '100');
          if (status) {
            url.searchParams.set('status', status);
          }
        }

        let response: Response | null = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          response = await fetch(url.toString(), {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (
            response.status === 429 ||
            (response.status >= 500 && response.status < 600)
          ) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : Math.min(1000 * 2 ** attempt, 30000);
            this.logger.warn(
              `Ramp API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          break;
        }

        if (!response) {
          throw new HttpException(
            'Failed to fetch users from Ramp',
            HttpStatus.BAD_GATEWAY,
          );
        }

        if (!response.ok) {
          if (response.status === 401) {
            throw new HttpException(
              'Ramp credentials expired. Please reconnect.',
              HttpStatus.UNAUTHORIZED,
            );
          }
          if (response.status === 403) {
            throw new HttpException(
              'Ramp access denied. Ensure users:read scope is granted.',
              HttpStatus.FORBIDDEN,
            );
          }

          const errorText = await response.text();
          this.logger.error(
            `Ramp API error: ${response.status} ${response.statusText} - ${errorText}`,
          );
          throw new HttpException(
            'Failed to fetch users from Ramp',
            HttpStatus.BAD_GATEWAY,
          );
        }

        const data: RampUsersResponse = await response.json();
        if (data.data?.length) {
          users.push(...data.data);
        }

        nextUrl = data.page?.next ?? null;
      } while (nextUrl);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error fetching Ramp users: ${error}`);
      throw new HttpException(
        'Failed to fetch users from Ramp',
        HttpStatus.BAD_GATEWAY,
      );
    }

    return users;
  }
}
