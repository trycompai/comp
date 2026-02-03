import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '@trycompai/db';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiKeyService } from './api-key.service';
import type { BetterAuthConfig } from '../config/better-auth.config';
import { AuthenticatedRequest } from './types';

@Injectable()
export class HybridAuthGuard implements CanActivate {
  private readonly betterAuthUrl: string;

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly configService: ConfigService,
  ) {
    const betterAuthConfig =
      this.configService.get<BetterAuthConfig>('betterAuth');
    this.betterAuthUrl =
      betterAuthConfig?.url || process.env.BETTER_AUTH_URL || '';

    if (!this.betterAuthUrl) {
      console.warn(
        '[HybridAuthGuard] BETTER_AUTH_URL not configured. JWT authentication will fail.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Try API Key authentication first (for external customers)
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      return this.handleApiKeyAuth(request, apiKey);
    }

    // Try Bearer JWT token authentication (for internal frontend)
    const authHeader = request.headers['authorization'] as string;
    if (authHeader?.startsWith('Bearer ')) {
      return this.handleJwtAuth(request, authHeader);
    }

    throw new UnauthorizedException(
      'Authentication required: Provide either X-API-Key or Bearer JWT token',
    );
  }

  private async handleApiKeyAuth(
    request: AuthenticatedRequest,
    apiKey: string,
  ): Promise<boolean> {
    const extractedKey = this.apiKeyService.extractApiKey(apiKey);
    if (!extractedKey) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const organizationId =
      await this.apiKeyService.validateApiKey(extractedKey);
    if (!organizationId) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Set request context for API key auth
    request.organizationId = organizationId;
    request.authType = 'api-key';
    request.isApiKey = true;
    // API keys are organization-scoped and are not tied to a specific user/member.
    request.userRoles = null;

    return true;
  }

  private async handleJwtAuth(
    request: AuthenticatedRequest,
    authHeader: string,
  ): Promise<boolean> {
    try {
      // Validate BETTER_AUTH_URL is configured
      if (!this.betterAuthUrl) {
        console.error(
          '[HybridAuthGuard] BETTER_AUTH_URL environment variable is not set',
        );
        throw new UnauthorizedException(
          'Authentication configuration error: BETTER_AUTH_URL not configured',
        );
      }

      // Extract token from "Bearer <token>"
      const token = authHeader.substring(7);

      const jwksUrl = `${this.betterAuthUrl}/api/auth/jwks`;

      // Create JWKS for token verification using Better Auth endpoint
      // Use shorter cache time to handle key rotation better
      const JWKS = createRemoteJWKSet(new URL(jwksUrl), {
        cacheMaxAge: 60000, // 1 minute cache (default is 5 minutes)
        cooldownDuration: 10000, // 10 seconds cooldown before refetching
      });

      // Verify JWT token with automatic retry on key mismatch
      let payload;
      try {
        payload = (
          await jwtVerify(token, JWKS, {
            issuer: this.betterAuthUrl,
            audience: this.betterAuthUrl,
          })
        ).payload;
      } catch (verifyError: any) {
        // If we get a key mismatch error, retry with a fresh JWKS fetch
        if (
          verifyError.code === 'ERR_JWKS_NO_MATCHING_KEY' ||
          verifyError.message?.includes('no applicable key found') ||
          verifyError.message?.includes('JWKSNoMatchingKey')
        ) {
          // Key mismatch — retry with fresh JWKS (handles key rotation)

          // Create a fresh JWKS instance with no cache to force immediate fetch
          const freshJWKS = createRemoteJWKSet(new URL(jwksUrl), {
            cacheMaxAge: 0, // No cache - force fresh fetch
            cooldownDuration: 0, // No cooldown - allow immediate retry
          });

          // Retry verification with fresh keys
          payload = (
            await jwtVerify(token, freshJWKS, {
              issuer: this.betterAuthUrl,
              audience: this.betterAuthUrl,
            })
          ).payload;

          // Token verified after JWKS refresh (key was rotated)
        } else {
          // Re-throw if it's not a key mismatch error
          throw verifyError;
        }
      }

      // Extract user information from JWT payload (user data is directly in payload for Better Auth JWT)
      const userId = payload.id as string;
      const userEmail = payload.email as string;

      if (!userId) {
        throw new UnauthorizedException(
          'Invalid JWT payload: missing user information',
        );
      }

      // JWT authentication REQUIRES explicit X-Organization-Id header
      const explicitOrgId = request.headers['x-organization-id'] as string;

      if (!explicitOrgId) {
        throw new UnauthorizedException(
          'Organization context required: X-Organization-Id header is mandatory for JWT authentication',
        );
      }

      // Verify user has access to the requested organization
      const hasAccess = await this.verifyUserOrgAccess(userId, explicitOrgId);
      if (!hasAccess) {
        throw new UnauthorizedException(
          `User does not have access to organization: ${explicitOrgId}`,
        );
      }

      const member = await db.member.findFirst({
        where: {
          userId,
          organizationId: explicitOrgId,
          deactivated: false,
        },
        select: {
          id: true,
          role: true,
          department: true,
        },
      });

      const userRoles = member?.role ? member.role.split(',') : null;

      // Set request context for JWT auth
      request.userId = userId;
      request.userEmail = userEmail;
      request.userRoles = userRoles;
      request.memberId = member?.id; // Set member ID for assignment filtering
      request.memberDepartment = member?.department; // Set department for visibility filtering
      request.organizationId = explicitOrgId;
      request.authType = 'jwt';
      request.isApiKey = false;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof Error) {
        // Connection errors — worth logging as errors
        if (
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('fetch failed')
        ) {
          console.error(
            `[HybridAuthGuard] Cannot connect to Better Auth JWKS endpoint at ${this.betterAuthUrl}/api/auth/jwks. Make sure BETTER_AUTH_URL is set correctly and the Better Auth server is running.`,
          );
          throw new UnauthorizedException(
            `Cannot connect to authentication service. Please check BETTER_AUTH_URL configuration.`,
          );
        }

        // Key mismatch after retry — expected when user has stale session
        if (
          (error as any).code === 'ERR_JWKS_NO_MATCHING_KEY' ||
          error.message.includes('no applicable key found') ||
          error.message.includes('JWKSNoMatchingKey')
        ) {
          throw new UnauthorizedException(
            'Authentication token is invalid. Please log out and log back in to refresh your session.',
          );
        }
      }

      // Unexpected errors — log these
      console.error('[HybridAuthGuard] JWT verification failed:', error);
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  /**
   * Verify that a user has access to a specific organization
   */
  private async verifyUserOrgAccess(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    try {
      const member = await db.member.findFirst({
        where: {
          userId,
          organizationId,
          deactivated: false,
        },
        select: {
          id: true,
          role: true,
        },
      });

      // User must be a member of the organization
      return !!member;
    } catch (error: unknown) {
      console.error('Error verifying user organization access:', error);
      return false;
    }
  }
}
