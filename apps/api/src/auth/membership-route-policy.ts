import { Logger } from '@nestjs/common';
import { APIError } from 'better-auth/api';

const logger = new Logger('MembershipRoutePolicy');

export const BLOCKED_MEMBERSHIP_PATHS: ReadonlySet<string> = new Set([
  '/organization/update-member-role',
]);

export function assertMembershipRouteAllowed(path: string): void {
  if (!BLOCKED_MEMBERSHIP_PATHS.has(path)) return;

  logger.warn(
    `Refused better-auth membership change on ${path}; role changes go through PATCH /v1/people/:id`,
  );
  throw new APIError('FORBIDDEN', { message: 'Forbidden' });
}
