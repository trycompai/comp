import { db } from '@db';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Generate a new API key
 * @returns A new API key with prefix
 */
export function generateApiKey(): string {
  // Generate a random string for the API key
  const apiKey = randomBytes(32).toString('hex');
  // Add a prefix to make it easily identifiable
  return `comp_${apiKey}`;
}

/**
 * Generate a random salt for API key hashing
 * @returns A random salt string
 */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Hash an API key for storage
 * @param apiKey The API key to hash
 * @param salt Optional salt to use for hashing. If not provided, the key is hashed without a salt (for backward compatibility).
 * @returns The hashed API key
 */
export function hashApiKey(apiKey: string, salt?: string): string {
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
 * Validate an API key from the request headers
 * @param req The Next.js request object
 * @returns The organization ID if the API key is valid, null otherwise
 */
export async function validateApiKey(req: NextRequest): Promise<string | null> {
  // Get the API key from the Authorization header
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  // Check if it's a Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    return await validateApiKeyValue(apiKey);
  }

  // Check if it's an X-API-Key header
  const apiKey = req.headers.get('X-API-Key');
  if (apiKey) {
    return await validateApiKeyValue(apiKey);
  }

  return null;
}

/**
 * Validate an API key value
 * @param apiKey The API key to validate
 * @returns The organization ID if the API key is valid, null otherwise
 */
async function validateApiKeyValue(apiKey: string): Promise<string | null> {
  if (!apiKey) {
    return null;
  }

  try {
    // Check if the model exists in the Prisma client
    if (typeof db.apiKey === 'undefined') {
      console.error('ApiKey model not found. Make sure to run migrations.');
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
      const hashedKey = record.salt ? hashApiKey(apiKey, record.salt) : hashApiKey(apiKey); // For backward compatibility

      return hashedKey === record.key;
    });

    // If no matching key or the key is expired, return null
    if (!matchingRecord || (matchingRecord.expiresAt && matchingRecord.expiresAt < new Date())) {
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

    // Return the organization ID
    return matchingRecord.organizationId;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

/**
 * Middleware to validate API keys for API routes
 * @param req The Next.js request object
 * @returns A response if the API key is invalid, or the organization ID if valid
 */
export async function apiKeyMiddleware(req: NextRequest): Promise<NextResponse | string> {
  const organizationId = await validateApiKey(req);

  if (!organizationId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  return organizationId;
}

/**
 * Get the organization ID from the API key in the request
 * This is a helper function that handles the result of apiKeyMiddleware
 * @param req The Next.js request object
 * @returns An object with the organization ID and/or error response
 */
export async function getOrganizationFromApiKey(req: NextRequest): Promise<{
  organizationId?: string;
  errorResponse?: NextResponse;
}> {
  const result = await apiKeyMiddleware(req);

  if (result instanceof NextResponse) {
    return { errorResponse: result };
  }

  return { organizationId: result };
}
