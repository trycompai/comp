import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { statement } from '@comp/auth';
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

  private generateSalt(): string {
    return randomBytes(16).toString('hex');
  }

  async create(
    organizationId: string,
    name: string,
    expiresAt?: string,
    scopes?: string[],
  ) {
    // Validate scopes if provided
    const validatedScopes = scopes?.length ? scopes : [];
    if (validatedScopes.length > 0) {
      const availableScopes = this.getAvailableScopes();
      const invalid = validatedScopes.filter((s) => !availableScopes.includes(s));
      if (invalid.length > 0) {
        throw new BadRequestException(
          `Invalid scopes: ${invalid.join(', ')}`,
        );
      }
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
          expirationDate = new Date(
            now.setFullYear(now.getFullYear() + 1),
          );
          break;
      }
    }

    const record = await db.apiKey.create({
      data: {
        name,
        key: hashedKey,
        salt,
        expiresAt: expirationDate,
        organizationId,
        scopes: validatedScopes,
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

      // Look up the API key in the database
      const apiKeyRecords = await db.apiKey.findMany({
        where: {
          isActive: true,
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

      // Find the matching API key by hashing with each record's salt
      const matchingRecord = apiKeyRecords.find((record) => {
        // Hash the provided API key with the record's salt
        const hashedKey = record.salt
          ? this.hashApiKey(apiKey, record.salt)
          : this.hashApiKey(apiKey); // For backward compatibility

        return hashedKey === record.key;
      });

      // If no matching key or the key is expired, return null
      if (
        !matchingRecord ||
        (matchingRecord.expiresAt && matchingRecord.expiresAt < new Date())
      ) {
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
   * Returns all valid `resource:action` scope pairs derived from the permission statement.
   */
  getAvailableScopes(): string[] {
    const scopes: string[] = [];
    for (const [resource, actions] of Object.entries(statement)) {
      for (const action of actions) {
        scopes.push(`${resource}:${action}`);
      }
    }
    return scopes;
  }
}
