import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { db } from '@db';
import { ApiKeyService } from './api-key.service';
import { auth } from './auth.server';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SKIP_ORG_CHECK_KEY } from './skip-org-check.decorator';
import { resolveServiceByToken } from './service-token.config';
import { AuthenticatedRequest } from './types';

@Injectable()
export class HybridAuthGuard implements CanActivate {
  private readonly logger = new Logger(HybridAuthGuard.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Try API Key authentication first (for external customers)
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      return this.handleApiKeyAuth(request, apiKey);
    }

    // Try Service Token authentication (for internal services)
    const serviceToken = request.headers['x-service-token'] as string;
    if (serviceToken) {
      return this.handleServiceTokenAuth(request, serviceToken);
    }

    // Try session-based authentication (bearer token or cookies)
    const skipOrgCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ORG_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    return this.handleSessionAuth(request, skipOrgCheck);
  }

  private async handleApiKeyAuth(
    request: AuthenticatedRequest,
    apiKey: string,
  ): Promise<boolean> {
    const extractedKey = this.apiKeyService.extractApiKey(apiKey);
    if (!extractedKey) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const result = await this.apiKeyService.validateApiKey(extractedKey);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Set request context for API key auth
    request.organizationId = result.organizationId;
    request.authType = 'api-key';
    request.isApiKey = true;
    request.isServiceToken = false;
    request.isPlatformAdmin = false;
    request.apiKeyScopes = result.scopes;
    // Surface the key's id + name on the request so downstream attribution
    // (ActingUserResolver, audit logs) can record "via API key '<name>'"
    // without an extra DB lookup.
    request.apiKeyId = result.apiKeyId;
    request.apiKeyName = result.apiKeyName;
    // API keys are organization-scoped and are not tied to a specific user/member.
    request.userRoles = null;

    return true;
  }

  private async handleServiceTokenAuth(
    request: AuthenticatedRequest,
    token: string,
  ): Promise<boolean> {
    const service = resolveServiceByToken(token);
    if (!service) {
      throw new UnauthorizedException('Invalid service token');
    }

    const organizationId = request.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new UnauthorizedException(
        'x-organization-id header is required for service token auth',
      );
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) {
      throw new UnauthorizedException(
        'Organization not found for the provided x-organization-id',
      );
    }

    request.organizationId = organizationId;
    request.authType = 'service';
    request.isApiKey = false;
    request.isServiceToken = true;
    request.serviceName = service.definition.name;
    request.isPlatformAdmin = false;
    request.userRoles = null;

    // Service tokens can pass x-user-id to act on behalf of a user
    // Validate that the user exists and belongs to the organization
    const actingUserId = request.headers['x-user-id'] as string;
    if (actingUserId) {
      const member = await db.member.findFirst({
        where: { userId: actingUserId, organizationId },
        select: { userId: true },
      });
      if (member) {
        request.userId = actingUserId;
      } else {
        this.logger.warn(
          `Service token x-user-id "${actingUserId}" not found in org ${organizationId}`,
        );
      }
    }

    this.logger.log(
      `Service "${service.definition.name}" authenticated for org ${organizationId}`,
    );

    return true;
  }

  private async handleSessionAuth(
    request: AuthenticatedRequest,
    skipOrgCheck = false,
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
        // Fallback: the hosted MCP server (Gram) sends an OAuth access token as a
        // Bearer token, which getSession does not resolve. Try the MCP OAuth path.
        if (await this.tryMcpOAuthAuth(request, headers, skipOrgCheck)) {
          return true;
        }
        throw new UnauthorizedException('Invalid or expired session');
      }

      const { user, session: sessionData } = session;

      if (!user?.id) {
        throw new UnauthorizedException(
          'Invalid session: missing user information',
        );
      }

      const organizationId = sessionData.activeOrganizationId;
      if (!organizationId && !skipOrgCheck) {
        throw new UnauthorizedException(
          'No active organization. Please select an organization.',
        );
      }

      // Fetch member data for role and department info
      // Skip if no active org or if org check is skipped (e.g., during onboarding)
      let userRoles: string[] | null = null;
      if (organizationId && !skipOrgCheck) {
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

        userRoles = member.role ? member.role.split(',') : null;
        request.memberId = member.id;
        request.memberDepartment = member.department;
      }

      // Set request context for session auth
      request.userId = user.id;
      request.userEmail = user.email;
      request.userRoles = userRoles;
      request.organizationId = organizationId || '';
      request.authType = 'session';
      request.isApiKey = false;
      request.isServiceToken = false;
      request.sessionId = sessionData.id;
      request.sessionDeviceAgent =
        (sessionData as Record<string, unknown>).deviceAgent === true;
      // Resolve isPlatformAdmin from the User.role column (via better-auth session),
      // not from the member relation. This ensures the flag is set regardless of
      // org membership or skipOrgCheck.
      request.isPlatformAdmin =
        (user as { role?: string | null }).role === 'admin';

      const rawImpersonatedBy = (sessionData as Record<string, unknown>)
        .impersonatedBy;
      if (typeof rawImpersonatedBy === 'string' && rawImpersonatedBy) {
        request.impersonatedBy = rawImpersonatedBy;
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('[HybridAuthGuard] Session verification failed:', error);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  /**
   * Resolve a hosted-MCP OAuth access token (issued by better-auth's mcp/oidc
   * provider and forwarded by the Gram-hosted MCP server). Populates the request
   * context and returns true on success; returns false when the bearer token is
   * not a valid MCP OAuth token (so the caller throws the generic 401). Throws
   * when no organization can be resolved.
   *
   * The token carries the user identity only. The organization is resolved
   * explicitly from the user's active memberships — the same approach as the
   * device-agent (enumerate memberships, then bind to one), not a "most recent"
   * guess. One org is used directly; multiple orgs fail closed because MCP org
   * selection isn't supported yet (avoids silently acting on the wrong tenant).
   * Roles come from the resolved member so the existing PermissionGuard enforces
   * RBAC unchanged.
   */
  private async tryMcpOAuthAuth(
    request: AuthenticatedRequest,
    headers: Headers,
    skipOrgCheck: boolean,
  ): Promise<boolean> {
    const token = await auth.api.getMcpSession({ headers }).catch(() => null);
    if (!token?.userId) {
      return false;
    }

    const userId = token.userId;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return false;
    }

    request.userId = user.id;
    request.userEmail = user.email;
    request.userRoles = null;
    request.organizationId = '';
    request.authType = 'session';
    request.isApiKey = false;
    request.isServiceToken = false;
    request.isPlatformAdmin = user.role === 'admin';

    if (skipOrgCheck) {
      this.logger.log(`MCP OAuth token authenticated for user ${user.id}`);
      return true;
    }

    // Bind the organization explicitly by enumerating active memberships,
    // mirroring the device-agent's getMyOrganizations + explicit selection.
    const memberships = await db.member.findMany({
      where: { userId, deactivated: false },
      select: { id: true, role: true, department: true, organizationId: true },
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException(
        'No active organization for this MCP token.',
      );
    }
    if (memberships.length > 1) {
      throw new UnauthorizedException(
        'This account belongs to multiple organizations. Selecting an ' +
          'organization for MCP access is not supported yet.',
      );
    }

    const member = memberships[0];
    request.organizationId = member.organizationId;
    request.memberId = member.id;
    request.memberDepartment = member.department;
    request.userRoles = member.role ? member.role.split(',') : null;

    this.logger.log(
      `MCP OAuth token authenticated for user ${user.id} (org ${member.organizationId})`,
    );
    return true;
  }
}
