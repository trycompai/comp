import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SKIP_AUTH_CONTEXT_RESPONSE_KEY } from './skip-auth-context-response.decorator';
import type { AuthenticatedRequest } from './types';

/**
 * Shape appended to authenticated responses.
 */
export interface AuthContextResponseFields {
  authType: AuthenticatedRequest['authType'];
  authenticatedUser?: { id: string; email: string };
}

/**
 * Appends `authType` (and `authenticatedUser` for session auth) to response
 * bodies.
 *
 * These fields were previously hand-written into each controller — 81 copies
 * across 14 of 94 controllers — so the same documented contract was honoured
 * by some endpoints and not others. Generated clients (the OpenAPI-derived MCP
 * server) key off consistent response shapes, so the inconsistency was a real
 * interoperability problem rather than a cosmetic one.
 *
 * Deliberately conservative about what it will touch: only plain JSON objects.
 * Arrays, primitives, null, buffers and streams pass through untouched, because
 * grafting fields onto them would corrupt the payload rather than annotate it.
 */
@Injectable()
export class AuthContextResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUTH_CONTEXT_RESPONSE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip || isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      map((body: unknown) => {
        if (!request.authType) {
          // No auth context (unauthenticated route, or a guard that does not
          // populate it) — nothing meaningful to report.
          return body;
        }

        if (!isPlainJsonObject(body)) {
          return body;
        }

        // A controller that still sets the fields itself wins, so the migration
        // can proceed file by file without double-writing.
        if ('authType' in body) {
          return body;
        }

        const fields: AuthContextResponseFields = { authType: request.authType };

        if (request.userId && request.userEmail) {
          fields.authenticatedUser = {
            id: request.userId,
            email: request.userEmail,
          };
        }

        return { ...body, ...fields };
      }),
    );
  }
}

/**
 * True only for plain objects safe to spread. Excludes arrays, null, class
 * instances with custom prototypes, buffers, streams and dates — anything
 * where spreading would lose behaviour or corrupt the payload.
 */
function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  if (value instanceof StreamableFile) return false;
  if (value instanceof Date) return false;
  if (Buffer.isBuffer(value)) return false;
  // Streams expose pipe(); spreading one yields a broken object.
  if (typeof (value as { pipe?: unknown }).pipe === 'function') return false;

  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
