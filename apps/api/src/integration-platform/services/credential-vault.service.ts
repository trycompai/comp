import { Injectable, Logger } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { CredentialRepository } from '../repositories/credential.repository';
import { ConnectionRepository } from '../repositories/connection.repository';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

// Refresh tokens 5 minutes before expiry to avoid race conditions
const REFRESH_BUFFER_SECONDS = 300;

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
  [key: string]: string; // Index signature for Prisma JSON compatibility
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

export interface TokenRefreshConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  clientAuthMethod?: 'body' | 'header';
  /** If provider has a separate refresh URL (rare) */
  refreshUrl?: string;
}

@Injectable()
export class CredentialVaultService {
  private readonly logger = new Logger(CredentialVaultService.name);

  constructor(
    private readonly credentialRepository: CredentialRepository,
    private readonly connectionRepository: ConnectionRepository,
  ) {}

  private getSecretKey(): string {
    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
      throw new Error('SECRET_KEY environment variable is not set');
    }
    return secretKey;
  }

  private deriveKey(secret: string, salt: Buffer): Buffer {
    return scryptSync(secret, salt, KEY_LENGTH, {
      N: 16384,
      r: 8,
      p: 1,
    });
  }

  async encrypt(text: string): Promise<EncryptedData> {
    const secretKey = this.getSecretKey();
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = this.deriveKey(secretKey, salt);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const secretKey = this.getSecretKey();
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const salt = Buffer.from(encryptedData.salt, 'base64');

    const key = this.deriveKey(secretKey, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /**
   * Store OAuth tokens for a connection
   */
  async storeOAuthTokens(
    connectionId: string,
    tokens: OAuthTokens,
  ): Promise<void> {
    // Encrypt each token field
    const encryptedPayload: Record<string, unknown> = {};

    if (tokens.access_token) {
      encryptedPayload.access_token = await this.encrypt(tokens.access_token);
    }
    if (tokens.refresh_token) {
      encryptedPayload.refresh_token = await this.encrypt(tokens.refresh_token);
    }
    if (tokens.token_type) {
      encryptedPayload.token_type = tokens.token_type;
    }
    if (tokens.scope) {
      encryptedPayload.scope = tokens.scope;
    }

    // Calculate expiration
    let expiresAt: Date | undefined;
    if (tokens.expires_in) {
      expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);
      encryptedPayload.expires_at = expiresAt.toISOString();
    }

    // Create new credential version
    const credentialVersion = await this.credentialRepository.create({
      connectionId,
      encryptedPayload,
      expiresAt,
    });

    // Update connection with active credential version
    await this.connectionRepository.update(connectionId, {
      activeCredentialVersionId: credentialVersion.id,
      status: 'active',
      errorMessage: null,
    });

    // Clean up old versions (keep last 5)
    await this.credentialRepository.deleteOldVersions(connectionId, 5);
  }

  /**
   * Store API key credentials for a connection
   */
  async storeApiKeyCredentials(
    connectionId: string,
    credentials: Record<string, string>,
  ): Promise<void> {
    const encryptedPayload: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string') {
        encryptedPayload[key] = await this.encrypt(value);
      } else {
        encryptedPayload[key] = value;
      }
    }

    const credentialVersion = await this.credentialRepository.create({
      connectionId,
      encryptedPayload,
    });

    await this.connectionRepository.update(connectionId, {
      activeCredentialVersionId: credentialVersion.id,
      status: 'active',
      errorMessage: null,
    });

    await this.credentialRepository.deleteOldVersions(connectionId, 5);
  }

  /**
   * Get decrypted credentials for a connection
   */
  async getDecryptedCredentials(
    connectionId: string,
  ): Promise<Record<string, string> | null> {
    const latestVersion =
      await this.credentialRepository.findLatestByConnection(connectionId);
    if (!latestVersion) return null;

    const encryptedPayload = latestVersion.encryptedPayload as Record<
      string,
      unknown
    >;
    const decrypted: Record<string, string> = {};

    for (const [key, value] of Object.entries(encryptedPayload)) {
      if (this.isEncryptedData(value)) {
        decrypted[key] = await this.decrypt(value);
      } else if (typeof value === 'string') {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  /**
   * Check if credentials are expired
   */
  async areCredentialsExpired(connectionId: string): Promise<boolean> {
    const latestVersion =
      await this.credentialRepository.findLatestByConnection(connectionId);
    if (!latestVersion) return true;
    if (!latestVersion.expiresAt) return false;
    return latestVersion.expiresAt < new Date();
  }

  /**
   * Rotate credentials (mark current as rotated, store new)
   */
  async rotateCredentials(
    connectionId: string,
    newCredentials: Record<string, string>,
  ): Promise<void> {
    const latestVersion =
      await this.credentialRepository.findLatestByConnection(connectionId);
    if (latestVersion) {
      await this.credentialRepository.markRotated(latestVersion.id);
    }

    await this.storeApiKeyCredentials(connectionId, newCredentials);
  }

  private isEncryptedData(value: unknown): value is EncryptedData {
    return (
      value !== null &&
      typeof value === 'object' &&
      'encrypted' in value &&
      'iv' in value &&
      'tag' in value &&
      'salt' in value
    );
  }

  /**
   * Check if credentials need to be refreshed (expired or expiring soon)
   */
  async needsRefresh(connectionId: string): Promise<boolean> {
    const latestVersion =
      await this.credentialRepository.findLatestByConnection(connectionId);
    if (!latestVersion) return false;
    if (!latestVersion.expiresAt) return false; // No expiry = no refresh needed (e.g., GitHub)

    const now = new Date();
    const bufferTime = new Date(now.getTime() + REFRESH_BUFFER_SECONDS * 1000);

    return latestVersion.expiresAt <= bufferTime;
  }

  /**
   * Get the refresh token for a connection (if available)
   */
  async getRefreshToken(connectionId: string): Promise<string | null> {
    const credentials = await this.getDecryptedCredentials(connectionId);
    return credentials?.refresh_token || null;
  }

  /**
   * Refresh OAuth tokens using the refresh token
   * Returns the new access token, or null if refresh failed
   */
  async refreshOAuthTokens(
    connectionId: string,
    config: TokenRefreshConfig,
  ): Promise<string | null> {
    const refreshToken = await this.getRefreshToken(connectionId);
    if (!refreshToken) {
      this.logger.warn(
        `No refresh token available for connection ${connectionId}`,
      );
      return null;
    }

    try {
      this.logger.log(`Refreshing OAuth tokens for connection ${connectionId}`);

      // Build the token request
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      };

      // Add client credentials based on auth method
      if (config.clientAuthMethod === 'header') {
        const credentials = Buffer.from(
          `${config.clientId}:${config.clientSecret}`,
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else {
        // Default: send in body
        body.set('client_id', config.clientId);
        body.set('client_secret', config.clientSecret);
      }

      // Use refreshUrl if provided, otherwise fall back to tokenUrl
      const refreshEndpoint = config.refreshUrl || config.tokenUrl;

      const response = await fetch(refreshEndpoint, {
        method: 'POST',
        headers,
        body: body.toString(),
      });

      if (!response.ok) {
        await response.text(); // consume body
        this.logger.error(
          `Token refresh failed for connection ${connectionId}: ${response.status}`,
        );

        // If refresh token is invalid/expired, mark connection as error
        if (response.status === 400 || response.status === 401) {
          await this.connectionRepository.update(connectionId, {
            status: 'error',
            errorMessage:
              'OAuth token expired. Please reconnect the integration.',
          });
        }

        return null;
      }

      const tokens: OAuthTokens = await response.json();

      // Store the new tokens
      // Note: Some providers return a new refresh token, some don't
      const tokensToStore: OAuthTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken, // Keep old refresh token if not provided
        token_type: tokens.token_type,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
      };

      await this.storeOAuthTokens(connectionId, tokensToStore);

      this.logger.log(
        `Successfully refreshed OAuth tokens for connection ${connectionId}`,
      );
      return tokens.access_token;
    } catch (error) {
      this.logger.error(
        `Error refreshing tokens for connection ${connectionId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get a valid access token, refreshing if necessary.
   * This is the main method to use when making API calls.
   */
  async getValidAccessToken(
    connectionId: string,
    refreshConfig?: TokenRefreshConfig,
  ): Promise<string | null> {
    // Check if we need to refresh
    const needsRefresh = await this.needsRefresh(connectionId);

    if (needsRefresh && refreshConfig) {
      const newToken = await this.refreshOAuthTokens(
        connectionId,
        refreshConfig,
      );
      if (newToken) {
        return newToken;
      }
      // If refresh failed, try to use existing token (might still work briefly)
    }

    // Get current credentials
    const credentials = await this.getDecryptedCredentials(connectionId);
    return credentials?.access_token || null;
  }
}
