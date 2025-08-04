import { Injectable, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { createHash } from 'node:crypto';

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
   * Validate an API key and return the organization ID
   * @param apiKey The API key to validate
   * @returns The organization ID if the API key is valid, null otherwise
   */
  async validateApiKey(apiKey: string): Promise<string | null> {
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

      // Return the organization ID
      return matchingRecord.organizationId;
    } catch (error) {
      this.logger.error('Error validating API key:', error);
      return null;
    }
  }
}
