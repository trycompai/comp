import type { CheckContext } from '../../types';
import { fetchGroupMemberUserIds } from './directory-client';
import type {
  GoogleWorkspaceGroupMembersResponse,
  GoogleWorkspaceRoleAssignment,
  GoogleWorkspaceRoleAssignmentsResponse,
  GoogleWorkspaceRolesResponse,
} from './types';

/** How a user came to hold an admin role. */
export type RoleGrantSource = 'direct' | 'group';

export interface ResolvedRoleGrant {
  roleName: string;
  source: RoleGrantSource;
  /** Group email/id the role came through, when source is 'group'. */
  viaGroup?: string;
}

export interface RoleResolution {
  /** userId -> the roles they hold, with provenance. */
  grantsByUserId: Map<string, ResolvedRoleGrant[]>;
  /** Group-assigned roles we could not expand (missing scope, API error). */
  unresolvedGroupAssignments: Array<{ groupId: string; roleName: string }>;
}

/** Google omits assigneeType on user assignments; absent means 'user'. */
export function isGroupAssignment(assignment: GoogleWorkspaceRoleAssignment): boolean {
  return assignment.assigneeType === 'group';
}

/** Fetch roleId -> roleName, following pagination. Empty map on failure. */
export async function fetchRoleMap(ctx: CheckContext): Promise<Map<string, string>> {
  const roleMap = new Map<string, string>();
  let pageToken: string | undefined;

  try {
    do {
      const params: Record<string, string> = { customer: 'my_customer' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<GoogleWorkspaceRolesResponse>(
        '/admin/directory/v1/customer/my_customer/roles',
        { params },
      );

      for (const role of response.items ?? []) roleMap.set(role.roleId, role.roleName);
      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch {
    ctx.warn('Could not fetch roles; role names will fall back to role IDs');
  }

  return roleMap;
}

/** Fetch every role assignment, following pagination. Empty list on failure. */
export async function fetchRoleAssignments(
  ctx: CheckContext,
): Promise<GoogleWorkspaceRoleAssignment[]> {
  const assignments: GoogleWorkspaceRoleAssignment[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const params: Record<string, string> = { customer: 'my_customer' };
      if (pageToken) params.pageToken = pageToken;

      const response = await ctx.fetch<GoogleWorkspaceRoleAssignmentsResponse>(
        '/admin/directory/v1/customer/my_customer/roleassignments',
        { params },
      );

      if (response.items?.length) assignments.push(...response.items);
      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch {
    ctx.warn('Could not fetch role assignments; admin roles will fall back to user flags');
  }

  return assignments;
}

/**
 * Resolve role assignments to per-user grants, expanding group assignments
 * to their members.
 *
 * Previously every assignment's `assignedTo` was treated as a user id, so a
 * role assigned to a group matched no user and that admin access was invisible
 * to the access review. Group expansion needs admin.directory.group.readonly;
 * when it is missing, the assignment is reported in
 * `unresolvedGroupAssignments` so the caller can say so explicitly rather than
 * silently under-reporting who holds admin access.
 */
export async function resolveRoleAssignments({
  ctx,
  assignments,
  roleMap,
}: {
  ctx: CheckContext;
  assignments: GoogleWorkspaceRoleAssignment[];
  roleMap: Map<string, string>;
}): Promise<RoleResolution> {
  const grantsByUserId = new Map<string, ResolvedRoleGrant[]>();
  const unresolvedGroupAssignments: RoleResolution['unresolvedGroupAssignments'] = [];
  const groupMemberCache = new Map<string, string[]>();

  const addGrant = (userId: string, grant: ResolvedRoleGrant): void => {
    const existing = grantsByUserId.get(userId) ?? [];
    existing.push(grant);
    grantsByUserId.set(userId, existing);
  };

  for (const assignment of assignments) {
    const roleName = roleMap.get(assignment.roleId) ?? `Role ${assignment.roleId}`;

    if (!isGroupAssignment(assignment)) {
      addGrant(assignment.assignedTo, { roleName, source: 'direct' });
      continue;
    }

    const groupId = assignment.assignedTo;

    let memberIds = groupMemberCache.get(groupId);
    if (!memberIds) {
      try {
        memberIds = await fetchGroupMemberUserIds({ client: ctx, groupId });
        groupMemberCache.set(groupId, memberIds);
      } catch {
        ctx.warn(
          `Could not expand group ${groupId} for role "${roleName}"; ` +
            'admin.directory.group.readonly may not be granted',
        );
        unresolvedGroupAssignments.push({ groupId, roleName });
        continue;
      }
    }

    for (const memberId of memberIds) {
      addGrant(memberId, { roleName, source: 'group', viaGroup: groupId });
    }
  }

  return { grantsByUserId, unresolvedGroupAssignments };
}
