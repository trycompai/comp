import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { ApiKeyService } from './api-key.service';
import { AuthenticatedRequest, BetterAuthSessionResponse } from './types';

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

    // Try Better Auth Session authentication (for internal frontend)
    const cookies = request.headers['cookie'] as string | undefined;
    if (cookies) {
      return this.handleSessionAuth(request, cookies);
    }

    throw new UnauthorizedException(
      'Authentication required: Provide either X-API-Key or valid session',
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

  private async handleSessionAuth(
    request: AuthenticatedRequest,
    cookies: string,
  ): Promise<boolean> {
    // Validate Better Auth session
    const session = await this.validateBetterAuthSession(cookies);
    if (!session?.user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Get organization ID from explicit header OR session fallback
    const explicitOrgId = request.headers['x-organization-id'] as string;
    const sessionOrgId = session.session.activeOrganizationId;

    const organizationId = explicitOrgId || sessionOrgId;

    if (!organizationId) {
      throw new UnauthorizedException(
        'Organization context required: Provide X-Organization-Id header or ensure session has active organization',
      );
    }

    // Critical: Verify user has access to the requested organization
    const hasAccess = await this.verifyUserOrgAccess(
      session.user.id,
      organizationId,
    );
    if (!hasAccess) {
      throw new UnauthorizedException(
        `User does not have access to organization: ${organizationId}`,
      );
    }

    // Set request context for session auth
    request.userId = session.user.id;
    request.userEmail = session.user.email;
    request.organizationId = organizationId;
    request.authType = 'session';
    request.isApiKey = false;

    return true;
  }

  /**
   * Validate Better Auth session by calling the auth API
   */
  private async validateBetterAuthSession(
    cookies: string,
  ): Promise<BetterAuthSessionResponse | null> {
    try {
      // Call Better Auth session endpoint
      const response = await fetch(
        `${process.env.BETTER_AUTH_URL}/api/auth/get-session`,
        {
          headers: {
            Cookie: cookies,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const sessionData = (await response.json()) as BetterAuthSessionResponse;
      return sessionData;
    } catch (error: unknown) {
      console.error('Error validating Better Auth session:', error);
      return null;
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
