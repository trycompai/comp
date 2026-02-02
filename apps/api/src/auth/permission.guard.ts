import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from './types';

/**
 * Represents a required permission for an endpoint
 */
export interface RequiredPermission {
  resource: string;
  actions: string[];
}

/**
 * Metadata key for storing required permissions on route handlers
 */
export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Roles that require assignment-based filtering for resources
 */
const RESTRICTED_ROLES = ['employee', 'contractor'];

/**
 * Roles that have full access without assignment filtering
 */
const PRIVILEGED_ROLES = ['owner', 'admin', 'auditor'];

/**
 * PermissionGuard - Validates user permissions using better-auth's hasPermission API
 *
 * This guard:
 * 1. Extracts required permissions from route metadata
 * 2. Calls better-auth's hasPermission endpoint to validate
 * 3. For restricted roles (employee/contractor), also checks assignment access
 *
 * Usage:
 * ```typescript
 * @UseGuards(HybridAuthGuard, PermissionGuard)
 * @RequirePermission('control', 'delete')
 * async deleteControl() { ... }
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);
  private readonly betterAuthUrl: string;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.betterAuthUrl =
      this.configService.get<string>('BETTER_AUTH_URL') ||
      process.env.BETTER_AUTH_URL ||
      '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from route metadata
    const requiredPermissions =
      this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // No permissions required - allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // API keys bypass permission checks for now
    // TODO: Implement API key scopes for fine-grained access control
    if (request.isApiKey) {
      this.logger.warn(
        `[PermissionGuard] API key bypassing permission check for ${requiredPermissions.map((p) => `${p.resource}:${p.actions.join(',')}`).join('; ')}`,
      );
      return true;
    }

    // JWT auth - validate permissions via better-auth
    const permissionBody: Record<string, string[]> = {};
    for (const perm of requiredPermissions) {
      permissionBody[perm.resource] = perm.actions;
    }

    try {
      const hasPermission = await this.checkPermission(
        request,
        permissionBody,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied. Required permissions: ${JSON.stringify(permissionBody)}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('[PermissionGuard] Error checking permissions:', error);
      throw new ForbiddenException('Unable to verify permissions');
    }
  }

  /**
   * Check permissions via better-auth's hasPermission API
   */
  private async checkPermission(
    request: AuthenticatedRequest,
    permissions: Record<string, string[]>,
  ): Promise<boolean> {
    if (!this.betterAuthUrl) {
      this.logger.error(
        '[PermissionGuard] BETTER_AUTH_URL not configured, falling back to role check',
      );
      return this.fallbackRoleCheck(request.userRoles, permissions);
    }

    try {
      const response = await fetch(
        `${this.betterAuthUrl}/api/auth/organization/has-permission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: request.headers['authorization'] as string,
          },
          body: JSON.stringify({
            permissions,
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `[PermissionGuard] hasPermission API returned ${response.status}`,
        );
        // Fall back to role-based check if better-auth is unavailable
        return this.fallbackRoleCheck(request.userRoles, permissions);
      }

      const result = await response.json();
      return result.success === true || result.hasPermission === true;
    } catch (error) {
      this.logger.warn(
        '[PermissionGuard] Failed to call hasPermission API, falling back to role check:',
        error,
      );
      return this.fallbackRoleCheck(request.userRoles, permissions);
    }
  }

  /**
   * Fallback permission check using role-based logic
   * Used when better-auth API is unavailable
   */
  private fallbackRoleCheck(
    userRoles: string[] | null,
    _permissions: Record<string, string[]>,
  ): boolean {
    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    // If user has any privileged role, allow access
    const hasPrivilegedRole = userRoles.some((role) =>
      PRIVILEGED_ROLES.includes(role),
    );

    return hasPrivilegedRole;
  }

  /**
   * Check if user has restricted role that requires assignment filtering
   */
  static isRestrictedRole(roles: string[] | null): boolean {
    if (!roles || roles.length === 0) {
      return true; // No roles = restricted
    }

    // If user has any privileged role, they're not restricted
    const hasPrivilegedRole = roles.some((role) =>
      PRIVILEGED_ROLES.includes(role),
    );
    if (hasPrivilegedRole) {
      return false;
    }

    // Check if all roles are restricted
    return roles.every((role) => RESTRICTED_ROLES.includes(role));
  }
}
