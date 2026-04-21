import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthContext as AuthContextType, AuthenticatedRequest } from './types';

/**
 * Parameter decorator to extract the full authentication context
 * Works with both API key and session authentication
 */
export const AuthContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthContextType => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    const {
      organizationId,
      authType,
      isApiKey,
      isServiceToken,
      serviceName,
      isPlatformAdmin,
      userId,
      userEmail,
      userRoles,
      memberId,
      memberDepartment,
    } = request;

    if (organizationId === undefined || !authType) {
      throw new Error(
        'Authentication context not found. Ensure HybridAuthGuard is applied.',
      );
    }

    return {
      organizationId,
      authType,
      isApiKey,
      isServiceToken,
      serviceName,
      isPlatformAdmin,
      userId,
      userEmail,
      userRoles,
      memberId,
      memberDepartment,
    };
  },
);

/**
 * Parameter decorator to extract just the organization ID.
 * Throws when no active organization is present on the request — only use this
 * on endpoints that require an active organization. For endpoints decorated
 * with @SkipOrgCheck() (e.g. onboarding), use @OrganizationIdOptional() instead.
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const { organizationId } = request;

    if (!organizationId) {
      throw new InternalServerErrorException(
        'Organization ID missing on request. If this endpoint is @SkipOrgCheck()-decorated, use @OrganizationIdOptional() instead.',
      );
    }

    return organizationId;
  },
);

/**
 * Parameter decorator to extract the organization ID when it may be absent.
 * Returns `undefined` instead of throwing when no active organization is
 * present. Use this on endpoints decorated with @SkipOrgCheck() where the
 * user may not yet have an active organization (e.g. during onboarding).
 */
export const OrganizationIdOptional = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.organizationId || undefined;
  },
);

/**
 * Parameter decorator to extract the user ID (only available for session auth)
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const { userId, authType } = request;

    if (authType === 'api-key') {
      throw new Error('User ID is not available for API key authentication');
    }

    if (!userId) {
      // For service tokens: allow if no user context needed (return a system identifier)
      if (authType === 'service') {
        return 'system';
      }
      throw new Error(
        'User ID not found. Ensure HybridAuthGuard is applied and using session auth.',
      );
    }

    return userId;
  },
);

/**
 * Parameter decorator to extract the member ID (only available for session auth)
 */
export const MemberId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.memberId;
  },
);

/**
 * Parameter decorator to check if the request is authenticated via API key
 */
export const IsApiKeyAuth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.isApiKey;
  },
);
