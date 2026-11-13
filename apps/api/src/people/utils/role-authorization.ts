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
    throw new ForbiddenException('Caller is not a member of this organization');
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

/** Who is asking. Session callers carry a userId; API keys carry only scopes. */
export interface MemberActor {
  userId?: string;
  roles?: string[] | null;
  isApiKey?: boolean;
  apiKeyScopes?: string[];
}

/** Build the actor from a request AuthContext — one place, both endpoints. */
export function toMemberActor(authContext: {
  userId?: string;
  userRoles: string[] | null;
  isApiKey: boolean;
  apiKeyScopes?: string[];
}): MemberActor {
  return {
    userId: authContext.userId,
    roles: authContext.userRoles,
    isApiKey: authContext.isApiKey,
    apiKeyScopes: authContext.apiKeyScopes,
  };
}

interface AuthorizeRoleRestorationParams {
  organizationId: string;
  targetMember: { id: string; userId: string; role: string };
  actor?: MemberActor;
}

/**
 * Reinstating a removed or inactive member re-grants every role the dormant row
 * still holds, so it is a role assignment and must clear the same ceiling as
 * `authorizeRoleChange`: the caller must be able to assign each stored role, and
 * only an owner may restore a member who holds the owner role. Refuses (403)
 * rather than downgrading, mirroring the role-edit path.
 */
export async function authorizeRoleRestoration({
  organizationId,
  targetMember,
  actor,
}: AuthorizeRoleRestorationParams): Promise<void> {
  const restoredRoles = parseRoles(targetMember.role);
  const callerRole = await resolveRestoringCallerRole({
    organizationId,
    actor,
  });
  const callerRoles = parseRoles(callerRole);

  if (restoredRoles.includes(OWNER_ROLE) && !callerRoles.includes(OWNER_ROLE)) {
    throw new ForbiddenException(
      'Only an owner can reinstate a member who holds the owner role',
    );
  }

  if (callerRoles.includes(OWNER_ROLE)) return;

  const context = {
    organizationId,
    callerRole,
    isApiKey: actor?.isApiKey,
    apiKeyScopes: actor?.apiKeyScopes,
  };
  const callerMemberActions = await resolveCallerMemberActions(context);
  const error = await validateAssignableRoles(
    restoredRoles,
    callerMemberActions,
    context,
  );
  if (error) {
    throw new ForbiddenException(`You cannot reinstate this member. ${error}`);
  }
}

/**
 * The caller's role string, resolved the same way `authorizeRoleChange` does it:
 * from the member row for sessions (never from the request body), from the key's
 * scopes for API keys, from the auth context for anything else.
 */
async function resolveRestoringCallerRole({
  organizationId,
  actor,
}: {
  organizationId: string;
  actor?: MemberActor;
}): Promise<string> {
  if (actor?.isApiKey) return '';

  if (!actor?.userId) return (actor?.roles ?? []).join(',');

  const callerMember = await db.member.findFirst({
    where: { userId: actor.userId, organizationId },
    select: { id: true, role: true },
  });
  if (!callerMember) {
    throw new ForbiddenException('Caller is not a member of this organization');
  }
  return callerMember.role;
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
