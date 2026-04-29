import { ForbiddenException } from '@nestjs/common';
import { db } from '@db';

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
 *  - A caller cannot assign a role they do not themselves possess.
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

  if (callerRoles.includes(OWNER_ROLE)) {
    return;
  }

  for (const role of newRoles) {
    if (!callerRoles.includes(role)) {
      throw new ForbiddenException(
        `You cannot assign the role "${role}" because you do not hold it`,
      );
    }
  }
}
