import { Logger } from '@nestjs/common';
import { APIError } from 'better-auth/api';

const logger = new Logger('MembershipRoutePolicy');

/**
 * Refuses better-auth's `/organization/update-member-role`. Role changes go
 * through `PATCH /v1/people/:id`, which applies the role-change rules and
 * writes the audit log. `/api/auth/*` never reaches the Nest guards, so this
 * hook is the only place the route can be stopped.
 */
export const BLOCKED_MEMBERSHIP_PATHS: ReadonlySet<string> = new Set([
  '/organization/update-member-role',
]);

/**
 * `path` is the matched endpoint path as better-auth's `before` hook receives
 * it — relative to the `/api/auth` base path, and the same for HTTP requests
 * and `auth.api.*` calls — so URL spelling cannot route around the check.
 *
 * The refusal is a bare 403 "Forbidden"; the reason is logged server-side.
 */
export function assertMembershipRouteAllowed(path: string): void {
  if (!BLOCKED_MEMBERSHIP_PATHS.has(path)) return;

  logger.warn(
    `Refused better-auth membership change on ${path}; role changes go through PATCH /v1/people/:id`,
  );
  throw new APIError('FORBIDDEN', { message: 'Forbidden' });
}
