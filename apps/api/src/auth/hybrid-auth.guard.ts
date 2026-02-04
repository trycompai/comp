import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { ApiKeyService } from './api-key.service';
import { auth } from './auth.server';
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

    // Try session-based authentication (bearer token or cookies)
    return this.handleSessionAuth(request);
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

  private async handleSessionAuth(
    request: AuthenticatedRequest,
  ): Promise<boolean> {
    try {
      // Build headers for better-auth SDK
      // Forwards both Authorization (bearer session token) and Cookie headers
      const headers = new Headers();
      const authHeader = request.headers['authorization'] as string;
      if (authHeader) {
        headers.set('authorization', authHeader);
      }
      const cookieHeader = request.headers['cookie'] as string;
      if (cookieHeader) {
        headers.set('cookie', cookieHeader);
      }

      if (!authHeader && !cookieHeader) {
        throw new UnauthorizedException(
          'Authentication required: Provide either X-API-Key, Bearer token, or session cookie',
        );
      }

      // Use better-auth SDK to resolve session
      // Works with both bearer session tokens and httpOnly cookies
      const session = await auth.api.getSession({ headers });

      if (!session) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      const { user, session: sessionData } = session;

      if (!user?.id) {
        throw new UnauthorizedException(
          'Invalid session: missing user information',
        );
      }

      const organizationId = sessionData.activeOrganizationId;
      if (!organizationId) {
        throw new UnauthorizedException(
          'No active organization. Please select an organization.',
        );
      }

      // Fetch member data for role and department info
      const member = await db.member.findFirst({
        where: {
          userId: user.id,
          organizationId,
          deactivated: false,
        },
        select: {
          id: true,
          role: true,
          department: true,
        },
      });

      if (!member) {
        throw new UnauthorizedException(
          `User is not a member of the active organization`,
        );
      }

      const userRoles = member.role ? member.role.split(',') : null;

      // Set request context for session auth
      request.userId = user.id;
      request.userEmail = user.email;
      request.userRoles = userRoles;
      request.memberId = member.id;
      request.memberDepartment = member.department;
      request.organizationId = organizationId;
      request.authType = 'session';
      request.isApiKey = false;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('[HybridAuthGuard] Session verification failed:', error);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
