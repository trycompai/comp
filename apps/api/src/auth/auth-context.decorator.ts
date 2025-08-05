import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext as AuthContextType, AuthenticatedRequest } from './types';

/**
 * Parameter decorator to extract the full authentication context
 * Works with both API key and session authentication
 */
export const AuthContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthContextType => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    const { organizationId, authType, isApiKey, userId, userEmail } = request;

    if (!organizationId || !authType) {
      throw new Error(
        'Authentication context not found. Ensure HybridAuthGuard is applied.',
      );
    }

    return {
      organizationId,
      authType,
      isApiKey,
      userId,
      userEmail,
    };
  },
);

/**
 * Parameter decorator to extract just the organization ID
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const { organizationId } = request;

    if (!organizationId) {
      throw new Error(
        'Organization ID not found. Ensure HybridAuthGuard is applied.',
      );
    }

    return organizationId;
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
      throw new Error(
        'User ID not found. Ensure HybridAuthGuard is applied and using session auth.',
      );
    }

    return userId;
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
