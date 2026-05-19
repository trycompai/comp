import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommentEntityType } from '@db';
import type { Request } from 'express';
import { auth } from '../auth/auth.server';
import {
  PERMISSIONS_KEY,
  type RequiredPermission,
} from '../auth/permission.guard';
import { resolveServiceByName } from '../auth/service-token.config';
import type { AuthenticatedRequest } from '../auth/types';

/**
 * Local request shape — combines the express-side fields we need
 * (`query`, `body`, `method`) with the project-wide AuthenticatedRequest
 * augmentations. The project's `AuthenticatedRequest` extends the global
 * fetch-API `Request` (no query/body), so we re-augment it here.
 */
type GuardedRequest = AuthenticatedRequest & Request;

/**
 * Comment endpoints support multiple entity types (task / policy / vendor /
 * risk / finding). The required permission is therefore dynamic — read by
 * `${entityType}:${action}` rather than the hardcoded `task:${action}` the
 * default PermissionGuard would enforce.
 *
 * Why it's needed: auditors hold `finding:update` but NOT `task:update`,
 * yet the only way to collaborate on a finding is to comment on it. The
 * vanilla guard would block them at the door.
 *
 * Implementation strategy:
 *   1. Read `@RequirePermission` metadata for the FALLBACK action (kept
 *      intact so AuditLogInterceptor still derives the right resource/
 *      action for its log line — close enough for audit trail purposes).
 *   2. Resolve the actual entityType from the request:
 *      - GET  → query string (`?entityType=finding`)
 *      - POST → request body (`{ entityType: "finding" }`)
 *      - PUT  / DELETE → fall back to the metadata's resource (commentId
 *        is opaque; resolving entityType would need a DB lookup which
 *        Phase 4 v1 explicitly defers — author-only editing keeps the
 *        existing task-permission gate in practice).
 *   3. Call better-auth's `hasPermission` with the resolved permission.
 */
@Injectable()
export class CommentsPermissionGuard implements CanActivate {
  private readonly logger = new Logger(CommentsPermissionGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<GuardedRequest>();

    if (request.isPlatformAdmin) return true;

    const fallback = required[0];
    const action = fallback.actions[0];
    const resource = this.resolveEntityResource(request, fallback.resource);
    const requiredScope = `${resource}:${action}`;

    // API keys: scope must explicitly include `${resource}:${action}`.
    // Mirrors PermissionGuard's API-key handling so the dynamic-resource
    // resolution doesn't accidentally bypass scope enforcement.
    if (request.isApiKey) {
      const scopes = request.apiKeyScopes;
      if (!scopes || scopes.length === 0) {
        // Legacy keys: same deprecation behavior as the standard guard —
        // allow until April 20 2026, deny after.
        const deprecationDate = new Date('2026-04-20T00:00:00Z');
        if (new Date() >= deprecationDate) {
          this.logger.warn(
            `[CommentsPermissionGuard] Legacy API key with empty scopes BLOCKED on ${request.method} ${request.url}.`,
          );
          throw new ForbiddenException(
            'This API key is no longer supported. Please regenerate your API key with explicit scopes.',
          );
        }
        return true;
      }
      if (!scopes.includes(requiredScope)) {
        this.logger.warn(
          `[CommentsPermissionGuard] API key lacks scope ${requiredScope}`,
        );
        throw new ForbiddenException('API key lacks required permission scope');
      }
      return true;
    }

    // Service tokens: same scope check against the token's allowlist.
    if (request.isServiceToken) {
      const service = resolveServiceByName(request.serviceName);
      if (!service) throw new ForbiddenException('Unknown service');
      if (!service.permissions.includes(requiredScope)) {
        this.logger.warn(
          `[CommentsPermissionGuard] Service "${request.serviceName}" lacks ${requiredScope}`,
        );
        throw new ForbiddenException('Service token lacks required permission');
      }
      return true;
    }

    const permissions: Record<string, string[]> = { [resource]: [action] };
    // Mirror standard PermissionGuard's try/catch — without it, network or
    // auth-service errors surface as 500s, potentially leaking internals.
    try {
      const allowed = await this.checkPermission(request, permissions);
      if (!allowed) {
        this.logger.warn(
          `[CommentsPermissionGuard] Denied ${request.method} ${request.url}. Required: ${requiredScope}`,
        );
        throw new ForbiddenException('Access denied');
      }
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(
        `[CommentsPermissionGuard] Error checking permissions for ${request.method} ${request.url}:`,
        error,
      );
      throw new ForbiddenException('Unable to verify permissions');
    }
  }

  private resolveEntityResource(
    request: GuardedRequest,
    fallback: string,
  ): string {
    const method = request.method?.toUpperCase();
    let candidate: unknown;
    if (method === 'GET') {
      candidate = (request.query as Record<string, unknown> | undefined)
        ?.entityType;
    } else if (method === 'POST') {
      candidate = (request.body as Record<string, unknown> | undefined)
        ?.entityType;
    }

    if (typeof candidate !== 'string') return fallback;
    // Trust only enum values — anything else falls back to the metadata.
    return (Object.values(CommentEntityType) as string[]).includes(candidate)
      ? candidate
      : fallback;
  }

  /**
   * Mirrors the cookie/header forwarding pattern of the standard
   * PermissionGuard so role-based and custom-role permissions both work.
   * Kept private and inline rather than extracted to a shared utility —
   * Phase 4 introduces only this one extra caller.
   */
  private async checkPermission(
    request: GuardedRequest,
    permissions: Record<string, string[]>,
  ): Promise<boolean> {
    const headers = new Headers();
    const authHeader = request.headers['authorization'] as string;
    if (authHeader) headers.set('authorization', authHeader);
    const cookieHeader = request.headers['cookie'] as string;
    if (cookieHeader) headers.set('cookie', cookieHeader);

    if (!authHeader && !cookieHeader) return false;

    // Spell the union-typed body out so zod 4 inside better-auth doesn't
    // reject the missing `permission` discriminator. Same gotcha as the
    // standard PermissionGuard.
    const body = { permissions, permission: undefined };
    const result = await auth.api.hasPermission({ headers, body });
    return result.success === true;
  }
}
