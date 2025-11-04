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

    return true;
  }

  private async handleJwtAuth(
    request: AuthenticatedRequest,
    authHeader: string,
  ): Promise<boolean> {
    try {
      // Extract token from "Bearer <token>"
      const token = authHeader.substring(7);

      // Create JWKS for token verification using Better Auth endpoint
      const JWKS = createRemoteJWKSet(
        new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`),
      );

      // Verify JWT token
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: process.env.BETTER_AUTH_URL,
        audience: process.env.BETTER_AUTH_URL,
      });

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

      // Set request context for JWT auth
      request.userId = userId;
      request.userEmail = userEmail;
      request.organizationId = explicitOrgId;
      request.authType = 'jwt';
      request.isApiKey = false;

      return true;
    } catch (error) {
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
