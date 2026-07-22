import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { db } from '@db';
import { ApiKeyService } from './api-key.service';
import { hasAppAccess } from './app-access';
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
    // The member who created the key (if recorded). Lets ActingUserResolver
    // attribute mutations to the real creator instead of the org owner.
    request.apiKeyCreatedByMemberId = result.createdByMemberId;
    // API keys are organization-scoped; no session user/member is attached here.
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
        select: { id: true, userId: true },
      });
      if (member) {
        request.userId = actingUserId;
        // Set the acting membership too, so Member-FK sinks (audit rows,
        // enteredById, etc.) can attribute to the acting member and not just
        // the user.
        request.memberId = member.id;
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
        if (await this.tryMcpOAuthAuth(request, headers)) {
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
      // Re-throw deliberate auth/permission errors as-is (e.g. the 403 from the
      // MCP org-resolution path). Only unexpected failures collapse to a 401.
      if (error instanceof HttpException) {
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
   * explicitly from the user's active memberships (device-agent style), never a
   * "most recent" guess. One org → used directly. Multiple orgs → the org the
   * user chose for MCP (McpOrgBinding, set at connect time) is used if they're
   * still a member; otherwise we ask them to choose rather than guess a tenant.
   * Roles come from the resolved member so the existing PermissionGuard enforces
   * RBAC unchanged.
   *
   * Two hard gates (both 403, never 401): the user must (1) be a member of an
   * organization at all — strangers who merely completed sign-in are rejected —
   * and (2) hold a role with app access (`app:read`) in the operative org, the
   * same rule the web app uses. Portal-only roles (employee/contractor) cannot
   * use the MCP.
   */
  private async tryMcpOAuthAuth(
    request: AuthenticatedRequest,
    headers: Headers,
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
    request.isMcpOAuth = true;
    request.isPlatformAdmin = user.role === 'admin';

    // An MCP token is only usable by a member of at least one organization.
    // Enumerate active memberships up front (device-agent style) so a user with
    // none — e.g. someone who completed Google sign-in but was never invited to
    // any org, or who was removed from all of them — is blocked from EVERY MCP
    // tool, including the org-agnostic (skipOrgCheck) ones.
    const memberships = await db.member.findMany({
      where: { userId, deactivated: false },
      select: { id: true, role: true, department: true, organizationId: true },
    });

    if (memberships.length === 0) {
      // Authenticated, but a member of nothing — not an auth failure, so 403
      // (not 401) keeps the MCP client from looping on re-authentication.
      throw new ForbiddenException(
        'This account is not a member of any organization, so it cannot use the MCP.',
      );
    }

    let member = memberships[0];
    if (memberships.length > 1) {
      // Multi-org: use the org the user chose for MCP (set at connect time),
      // as long as they're still a member of it. No saved/valid choice → ask
      // them to pick rather than guessing a tenant.
      const binding = await db.mcpOrgBinding.findUnique({
        where: { userId },
        select: { organizationId: true },
      });
      const chosen = binding
        ? memberships.find((m) => m.organizationId === binding.organizationId)
        : undefined;
      if (!chosen) {
        // 403 (not 401): the token is valid — the user just needs to pick an
        // org. A 401 would make the MCP client re-run sign-in in a loop.
        throw new ForbiddenException(
          'This account belongs to multiple organizations. Choose your ' +
            'organization for AI/MCP access in Comp AI settings, then try again.',
        );
      }
      member = chosen;
    }

    // App-access gate: MCP follows the same rule as the web app — only roles
    // that grant app access (`app:read`) may use it. Portal-only roles
    // (employee/contractor, or custom roles without app access) are rejected.
    // Platform admins bypass this, consistent with PermissionGuard's own
    // isPlatformAdmin bypass on the normal session path.
    if (
      !request.isPlatformAdmin &&
      !(await hasAppAccess(member.organizationId, member.role))
    ) {
      throw new ForbiddenException(
        "Your role doesn't have access to the app, so it can't use the MCP. " +
          'Ask an organization admin for access.',
      );
    }

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
