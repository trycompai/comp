import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '@db';
import { BUILT_IN_ROLE_PERMISSIONS } from '@trycompai/auth';
import {
  resolveCallerMemberActions,
  validateAssignableRoles,
} from './role-assignment';

const OWNER_ROLE = 'owner';

/**
 * Parse a comma-separated role string into a clean list of role names.
 */
export function parseRoles(role: string | null | undefined): string[] {
  return (role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
}

interface AuthorizeRoleChangeParams {
  callerUserId: string;
  organizationId: string;
  targetMember: { id: string; userId: string; role: string };
  newRole: string;
}

/**
 * Centralized authorization for role changes via PATCH /v1/people/:id.
 *
 * Enforces:
 *  - Caller cannot change their OWN role (use /organization/transfer-ownership for owner moves).
 *  - The 'owner' role can only be granted/revoked via /organization/transfer-ownership.
 *  - Only an owner can change the roles of an owner.
 *  - `validateAssignableRoles` applies to the current and the new roles.
 */
export async function authorizeRoleChange({
  callerUserId,
  organizationId,
  targetMember,
  newRole,
}: AuthorizeRoleChangeParams): Promise<void> {
  const callerMember = await db.member.findFirst({
    where: { userId: callerUserId, organizationId },
    select: { id: true, role: true },
  });

  if (!callerMember) {
    throw new ForbiddenException(
      'Caller is not a member of this organization',
    );
  }

  const callerRoles = parseRoles(callerMember.role);
  const existingRoles = parseRoles(targetMember.role);
  const newRoles = parseRoles(newRole);

  if (targetMember.userId === callerUserId) {
    throw new ForbiddenException(
      'You cannot change your own role. Use /organization/transfer-ownership to change ownership.',
    );
  }

  const newHasOwner = newRoles.includes(OWNER_ROLE);
  const existingHasOwner = existingRoles.includes(OWNER_ROLE);

  if (newHasOwner !== existingHasOwner) {
    throw new ForbiddenException(
      'Owner role can only be assigned via /organization/transfer-ownership',
    );
  }

  await assertRolesExist({ organizationId, roles: newRoles });

  if (callerRoles.includes(OWNER_ROLE)) {
    return;
  }

  if (existingHasOwner) {
    throw new ForbiddenException(
      'Only an owner can change the roles of an owner',
    );
  }

  const context = { organizationId, callerRole: callerMember.role };
  const callerMemberActions = await resolveCallerMemberActions(context);

  const existingRolesError = await validateAssignableRoles(
    existingRoles,
    callerMemberActions,
    context,
  );
  if (existingRolesError) {
    throw new ForbiddenException(
      `You cannot change the roles of this member. ${existingRolesError}`,
    );
  }

  const newRolesError = await validateAssignableRoles(
    newRoles,
    callerMemberActions,
    context,
  );
  if (newRolesError) {
    throw new ForbiddenException(newRolesError);
  }
}

async function assertRolesExist({
  organizationId,
  roles,
}: {
  organizationId: string;
  roles: string[];
}): Promise<void> {
  const customRoleNames = roles.filter(
    (role) => !Object.hasOwn(BUILT_IN_ROLE_PERMISSIONS, role),
  );
  if (customRoleNames.length === 0) return;

  const found = await db.organizationRole.findMany({
    where: { organizationId, name: { in: customRoleNames } },
    select: { name: true },
  });
  const foundNames = new Set(found.map((role) => role.name));
  const unknown = customRoleNames.filter((name) => !foundNames.has(name));
  if (unknown.length > 0) {
    throw new BadRequestException(`Unknown roles: ${unknown.join(', ')}`);
  }
}
