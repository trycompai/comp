import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESTRICTED_ROLES, PRIVILEGED_ROLES } from '@comp/auth';
import { auth } from './auth.server';
import { resolveServiceByName } from './service-token.config';
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
 * PermissionGuard - Validates user permissions using better-auth's SDK
 *
 * This guard:
 * 1. Extracts required permissions from route metadata
 * 2. Uses better-auth's hasPermission SDK to validate against role definitions
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

  constructor(private reflector: Reflector) {}

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

    // API key scope enforcement
    if (request.isApiKey) {
      const scopes = request.apiKeyScopes;

      // Legacy keys (empty scopes) = full access for backward compatibility
      if (!scopes || scopes.length === 0) {
        return true;
      }

      // Scoped keys: enforce permissions
      const hasAllPerms = requiredPermissions.every((perm) =>
        perm.actions.every((action) =>
          scopes.includes(`${perm.resource}:${action}`),
        ),
      );

      if (!hasAllPerms) {
        throw new ForbiddenException(
          'API key lacks required permission scope',
        );
      }
      return true;
    }

    // Service tokens: check scoped permissions (NOT a blanket bypass)
    if (request.isServiceToken) {
      const service = resolveServiceByName(request.serviceName);
      if (!service) {
        throw new ForbiddenException('Unknown service');
      }

      const hasAllPerms = requiredPermissions.every((perm) =>
        perm.actions.every((action) =>
          service.permissions.includes(`${perm.resource}:${action}`),
        ),
      );

      if (!hasAllPerms) {
        this.logger.warn(
          `[PermissionGuard] Service "${request.serviceName}" denied: missing permission for ${requiredPermissions.map((p) => `${p.resource}:${p.actions.join(',')}`).join('; ')}`,
        );
        throw new ForbiddenException(
          'Service token lacks required permission',
        );
      }

      return true;
    }

    // Platform admins bypass permission checks (full access)
    if (request.isPlatformAdmin) {
      return true;
    }

    // Build required permissions map
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
        this.logger.warn(
          `[PermissionGuard] Access denied for ${request.method} ${request.url}. Required: ${JSON.stringify(permissionBody)}`,
        );
        throw new ForbiddenException('Access denied');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`[PermissionGuard] Error checking permissions for ${request.method} ${request.url}:`, error);
      throw new ForbiddenException('Unable to verify permissions');
    }
  }

  /**
   * Check permissions using better-auth's hasPermission SDK.
   * Forwards both authorization and cookie headers so better-auth
   * can resolve the user session (and activeOrganizationId), then
   * checks the required permissions against the role definitions
   * (including dynamic/custom roles stored in the DB).
   */
  private async checkPermission(
    request: AuthenticatedRequest,
    permissions: Record<string, string[]>,
  ): Promise<boolean> {
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
      return false;
    }

    const result = await auth.api.hasPermission({
      headers,
      body: { permissions },
    });

    return result.success === true;
  }

  /**
   * Check if user has restricted role that requires assignment filtering
   */
  static isRestrictedRole(roles: string[] | null): boolean {
    if (!roles || roles.length === 0) {
      return true; // No roles = restricted
    }

    // If user has any privileged role, they're not restricted
    const privileged: readonly string[] = PRIVILEGED_ROLES;
    const restricted: readonly string[] = RESTRICTED_ROLES;
    const hasPrivilegedRole = roles.some((role) =>
      privileged.includes(role),
    );
    if (hasPrivilegedRole) {
      return false;
    }

    // Check if all roles are restricted
    return roles.every((role) => restricted.includes(role));
  }
}
