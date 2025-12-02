import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { CredentialRepository } from '../repositories/credential.repository';
import { ConnectionRepository } from '../repositories/connection.repository';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

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

@Injectable()
export class CredentialVaultService {
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

    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
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

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
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
  async getDecryptedCredentials(connectionId: string): Promise<Record<string, string> | null> {
    const latestVersion = await this.credentialRepository.findLatestByConnection(connectionId);
    if (!latestVersion) return null;

    const encryptedPayload = latestVersion.encryptedPayload as Record<string, unknown>;
    const decrypted: Record<string, string> = {};

    for (const [key, value] of Object.entries(encryptedPayload)) {
      if (this.isEncryptedData(value)) {
        decrypted[key] = await this.decrypt(value as EncryptedData);
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
    const latestVersion = await this.credentialRepository.findLatestByConnection(connectionId);
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
    const latestVersion = await this.credentialRepository.findLatestByConnection(connectionId);
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
}

