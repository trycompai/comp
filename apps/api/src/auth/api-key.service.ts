import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '@db';
import { statement } from '@trycompai/auth';
import { createHash, randomBytes } from 'node:crypto';

/** Result from validating an API key */
export interface ApiKeyValidationResult {
  organizationId: string;
  scopes: string[];
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  /**
   * Hash an API key for comparison
   * @param apiKey The API key to hash
   * @param salt Optional salt to use for hashing
   * @returns The hashed API key
   */
  private hashApiKey(apiKey: string, salt?: string): string {
    if (salt) {
      // If salt is provided, use it for hashing
      return createHash('sha256')
        .update(apiKey + salt)
        .digest('hex');
    }
    // For backward compatibility, hash without salt
    return createHash('sha256').update(apiKey).digest('hex');
  }

  private generateApiKey(): string {
    const apiKey = randomBytes(32).toString('hex');
    return `comp_${apiKey}`;
  }

  /** Extract the first 8 chars after the `comp_` prefix for indexed lookup */
  private extractPrefix(apiKey: string): string {
    return apiKey.slice(5, 13);
  }

  private generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  async create(
    organizationId: string,
    name: string,
    expiresAt?: string,
    scopes?: string[],
  ) {
    // New keys must have explicit scopes — no more legacy empty-scope keys
    if (!scopes || scopes.length === 0) {
      throw new BadRequestException(
        'API keys must have at least one scope. Use the "Full Access" preset to grant all permissions.',
      );
    }
    // Validate all scopes against the allowlist
    const availableScopes = this.getAvailableScopes();
    const invalid = scopes.filter((s) => !availableScopes.includes(s));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid scopes: ${invalid.join(', ')}`);
    }

    const apiKey = this.generateApiKey();
    const salt = this.generateSalt();
    const hashedKey = this.hashApiKey(apiKey, salt);

    let expirationDate: Date | null = null;
    if (expiresAt && expiresAt !== 'never') {
      const now = new Date();
      switch (expiresAt) {
        case '30days':
          expirationDate = new Date(now.setDate(now.getDate() + 30));
          break;
        case '90days':
          expirationDate = new Date(now.setDate(now.getDate() + 90));
          break;
        case '1year':
          expirationDate = new Date(now.setFullYear(now.getFullYear() + 1));
          break;
        default:
          throw new BadRequestException(
            `Invalid expiresAt value: ${expiresAt}. Must be "never", "30days", "90days", or "1year".`,
          );
      }
    }

    const keyPrefix = this.extractPrefix(apiKey);

    const record = await db.apiKey.create({
      data: {
        name,
        key: hashedKey,
        keyPrefix,
        salt,
        expiresAt: expirationDate,
        organizationId,
        scopes,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return {
      ...record,
      key: apiKey,
      createdAt: record.createdAt.toISOString(),
      expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    };
  }

  async revoke(apiKeyId: string, organizationId: string) {
    const result = await db.apiKey.updateMany({
      where: {
        id: apiKeyId,
        organizationId,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        'API key not found or not authorized to revoke',
      );
    }

    return { success: true };
  }

  /**
   * Extract API key from request headers
   * @param apiKeyHeader X-API-Key header value
   * @returns The API key if found, null otherwise
   */
  extractApiKey(apiKeyHeader?: string): string | null {
    // Check if it's an X-API-Key header
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return null;
  }

  /**
   * Validate an API key and return the organization ID + scopes
   * @param apiKey The API key to validate
   * @returns The validation result if valid, null otherwise
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult | null> {
    if (!apiKey) {
      return null;
    }

    try {
      // Check if the model exists in the Prisma client
      if (typeof db.apiKey === 'undefined') {
        this.logger.error(
          'ApiKey model not found. Make sure to run migrations.',
        );
        return null;
      }

      // Use key prefix for indexed lookup when available (new keys),
      // fall back to full scan for legacy keys without prefix
      const keyPrefix = apiKey.startsWith('comp_')
        ? this.extractPrefix(apiKey)
        : null;

      const apiKeyRecords = await db.apiKey.findMany({
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          ...(keyPrefix ? { keyPrefix } : {}),
        },
        select: {
          id: true,
          key: true,
          salt: true,
          organizationId: true,
          expiresAt: true,
          scopes: true,
        },
      });

      // Find the matching API key by hashing with each candidate's salt
      const matchingRecord = apiKeyRecords.find((record) => {
        const hashedKey = record.salt
          ? this.hashApiKey(apiKey, record.salt)
          : this.hashApiKey(apiKey);
        return hashedKey === record.key;
      });

      if (!matchingRecord) {
        // If prefix lookup found nothing, try legacy keys (no prefix set)
        if (keyPrefix) {
          const legacyRecords = await db.apiKey.findMany({
            where: {
              isActive: true,
              keyPrefix: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: {
              id: true,
              key: true,
              salt: true,
              organizationId: true,
              expiresAt: true,
              scopes: true,
            },
          });
          const legacyMatch = legacyRecords.find((record) => {
            const hashedKey = record.salt
              ? this.hashApiKey(apiKey, record.salt)
              : this.hashApiKey(apiKey);
            return hashedKey === record.key;
          });
          if (legacyMatch) {
            // Backfill the prefix for future lookups
            await db.apiKey.update({
              where: { id: legacyMatch.id },
              data: { keyPrefix, lastUsedAt: new Date() },
            });
            return {
              organizationId: legacyMatch.organizationId,
              scopes: legacyMatch.scopes,
            };
          }
        }
        this.logger.warn('Invalid or expired API key attempted');
        return null;
      }

      // Update the lastUsedAt timestamp
      await db.apiKey.update({
        where: {
          id: matchingRecord.id,
        },
        data: {
          lastUsedAt: new Date(),
        },
      });

      this.logger.log(
        `Valid API key used for organization: ${matchingRecord.organizationId}`,
      );

      return {
        organizationId: matchingRecord.organizationId,
        scopes: matchingRecord.scopes,
      };
    } catch (error) {
      this.logger.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * Resources from better-auth that are not used by any API endpoint's @RequirePermission.
   * These are handled internally by better-auth for session-based auth only.
   */
  private static readonly INTERNAL_ONLY_RESOURCES = ['invitation', 'team'];

  /**
   * Returns all valid `resource:action` scope pairs derived from the permission statement.
   * Excludes internal-only resources that no API endpoint uses via @RequirePermission.
   */
  getAvailableScopes(): string[] {
    const scopes: string[] = [];
    for (const [resource, actions] of Object.entries(statement)) {
      if (ApiKeyService.INTERNAL_ONLY_RESOURCES.includes(resource)) {
        continue;
      }
      for (const action of actions) {
        scopes.push(`${resource}:${action}`);
      }
    }
    return scopes;
  }
}
