import { Logger } from '@nestjs/common';
import { APIError } from 'better-auth/api';

const logger = new Logger('MembershipRoutePolicy');

export const BLOCKED_MEMBERSHIP_PATHS: ReadonlySet<string> = new Set([
  '/organization/update-member-role',
  '/organization/leave',
  '/organization/remove-member',
]);

// Dynamic access control (custom roles) is managed only through /v1/roles.
// better-auth's own CRUD routes bypass every rule in RolesService — the
// 20-role cap, the compliance->portal invariant, the reserved-name check on
// the row being edited — and they expose obligation-override rows (rows named
// after a built-in role) with their raw permission blob.
export const BLOCKED_ROLE_CRUD_PATHS: ReadonlySet<string> = new Set([
  '/organization/create-role',
  '/organization/update-role',
  '/organization/delete-role',
  '/organization/list-roles',
  '/organization/get-role',
]);

export function assertMembershipRouteAllowed(path: string): void {
  if (!BLOCKED_MEMBERSHIP_PATHS.has(path) && !BLOCKED_ROLE_CRUD_PATHS.has(path))
    return;

  logger.warn(
    `Refused better-auth organization route ${path}; membership and role changes go through /v1/people/:id and /v1/roles`,
  );
  throw new APIError('FORBIDDEN', { message: 'Forbidden' });
}
