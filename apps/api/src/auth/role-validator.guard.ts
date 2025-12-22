import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from './types';

@Injectable()
export class RoleValidator implements CanActivate {
  private readonly unauthenticatedErrorMessage: string;
  private readonly noRolesSpecifiedErrorMessage: string;
  private readonly accessDeniedErrorMessage: string;
  private readonly allowedRoles: string[] | null;

  constructor(allowedRoles: string[] | null) {
    this.allowedRoles = allowedRoles;

    this.unauthenticatedErrorMessage =
      'Role-based authorization requires user authentication (JWT token)';
    this.noRolesSpecifiedErrorMessage = 'No roles specified for authorization';
    this.accessDeniedErrorMessage =
      'Access denied. User does not have the required roles: {allowedRoles}, user has roles: {userRoles}';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const { userRoles, userId, organizationId, authType, isApiKey } = request;

    if (!this.allowedRoles || this.allowedRoles.length === 0) {
      throw new UnauthorizedException(this.noRolesSpecifiedErrorMessage);
    }

    // API keys are organization-scoped and not tied to a specific user/member.
    // They are allowed through role-protected endpoints.
    if (isApiKey || authType === 'api-key') {
      if (!organizationId) {
        throw new UnauthorizedException(
          'Organization context required for API key authentication',
        );
      }

      return true;
    }

    // JWT requests must have user context + roles for role-based authorization
    if (!userId || !organizationId || !userRoles || userRoles.length === 0) {
      throw new UnauthorizedException(this.unauthenticatedErrorMessage);
    }

    const hasRequiredRoles = this.allowedRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRoles) {
      throw new UnauthorizedException(
        this.accessDeniedErrorMessage
          .replace('{allowedRoles}', this.allowedRoles.join(', '))
          .replace('{userRoles}', userRoles.join(', ')),
      );
    }

    return true;
  }
}

export const RequireRoles = (...roles: string[]) => new RoleValidator(roles);
