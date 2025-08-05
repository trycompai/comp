import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiKeyService } from './api-key.service';
import { AuthenticatedRequest } from './types';

@Injectable()
export class HybridAuthGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Try API Key authentication first (for external customers)
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      return this.handleApiKeyAuth(request, apiKey);
    }

    // Try JWT Bearer authentication (for internal frontend with JWT tokens)
    const authHeader = request.headers['authorization'] as string;
    if (authHeader?.startsWith('Bearer ')) {
      return this.handleJwtAuth(request, authHeader);
    }

    throw new UnauthorizedException(
      'Authentication required: Provide X-API-Key or Authorization Bearer JWT token',
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

    return true;
  }

  private async handleJwtAuth(
    request: AuthenticatedRequest,
    authHeader: string,
  ): Promise<boolean> {
    try {
      // Extract JWT token from Bearer header
      const token = authHeader.replace('Bearer ', '');

      // Verify JWT using Better Auth JWKS endpoint
      const JWKS = createRemoteJWKSet(
        new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`),
      );

      const { payload } = await jwtVerify(token, JWKS, {
        issuer: process.env.BETTER_AUTH_URL,
        audience: process.env.BETTER_AUTH_URL,
      });

      // Extract user information from JWT payload
      // By default, Better Auth includes the entire user object in the payload
      const user = payload.user as { id: string; email: string };
      if (!user?.id) {
        throw new UnauthorizedException(
          'Invalid JWT payload: missing user information',
        );
      }

      // Require explicit organization ID via header for JWT auth
      const organizationId = request.headers['x-organization-id'] as string;
      if (!organizationId) {
        throw new UnauthorizedException(
          'Organization context required: Provide X-Organization-Id header for JWT authentication',
        );
      }

      // Critical: Verify user has access to the requested organization
      const hasAccess = await this.verifyUserOrgAccess(user.id, organizationId);
      if (!hasAccess) {
        throw new UnauthorizedException(
          `User does not have access to organization: ${organizationId}`,
        );
      }

      // Set request context for JWT auth
      request.userId = user.id;
      request.userEmail = user.email;
      request.organizationId = organizationId;
      request.authType = 'jwt';
      request.isApiKey = false;

      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('JWT verification failed:', error);
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
