import {
  BUILT_IN_ROLE_PERMISSIONS,
  type RoleName,
  allRoles,
} from '@comp/auth';
import { db } from '@trycompai/db';

const BUILT_IN_ROLE_NAMES = new Set<string>(Object.keys(allRoles));

/**
 * Check if a resolved permission set includes `compliance:required`.
 */
function hasComplianceRequired(permissions: Record<string, string[]>): boolean {
  return permissions.compliance?.includes('required') ?? false;
}

/**
 * Resolve built-in permissions from a comma-separated role string.
 * Returns merged permissions and any custom role names.
 */
function resolveBuiltIn(roleString: string): {
  permissions: Record<string, string[]>;
  customRoleNames: string[];
} {
  const roleNames = roleString.split(',').map((r) => r.trim()).filter(Boolean);
  const permissions: Record<string, string[]> = {};
  const customRoleNames: string[] = [];

  for (const name of roleNames) {
    if (BUILT_IN_ROLE_NAMES.has(name)) {
      const builtIn = BUILT_IN_ROLE_PERMISSIONS[name];
      if (builtIn) {
        for (const [resource, actions] of Object.entries(builtIn)) {
          if (!permissions[resource]) permissions[resource] = [];
          for (const action of actions) {
            if (!permissions[resource].includes(action)) {
              permissions[resource].push(action);
            }
          }
        }
      }
    } else {
      customRoleNames.push(name);
    }
  }

  return { permissions, customRoleNames };
}

interface MemberWithRole {
  role: string;
}

/**
 * Filter members to only those with `compliance:required` permission.
 * Resolves built-in role permissions in-memory and fetches custom role
 * permissions with a single DB query.
 */
export async function filterComplianceMembers<T extends MemberWithRole>(
  members: T[],
  organizationId: string,
): Promise<T[]> {
  if (members.length === 0) return [];

  const allCustomRoleNames = new Set<string>();
  const memberResolvedBuiltIn = members.map((member) => {
    const { permissions, customRoleNames } = resolveBuiltIn(member.role);
    for (const name of customRoleNames) allCustomRoleNames.add(name);
    return { member, permissions, customRoleNames };
  });

  let customRoleMap: Record<string, Record<string, string[]>> = {};
  if (allCustomRoleNames.size > 0) {
    const customRoles = await db.organizationRole.findMany({
      where: {
        organizationId,
        name: { in: [...allCustomRoleNames] },
      },
      select: { name: true, permissions: true },
    });

    customRoleMap = Object.fromEntries(
      customRoles
        .filter((r) => r.permissions)
        .map((r) => {
          const parsed =
            typeof r.permissions === 'string'
              ? JSON.parse(r.permissions)
              : r.permissions;
          return [r.name, parsed as Record<string, string[]>];
        }),
    );
  }

  return memberResolvedBuiltIn
    .filter(({ permissions, customRoleNames }) => {
      const effective: Record<string, string[]> = { ...permissions };
      for (const name of customRoleNames) {
        const customPerms = customRoleMap[name];
        if (customPerms) {
          for (const [resource, actions] of Object.entries(customPerms)) {
            if (!effective[resource]) effective[resource] = [];
            for (const action of actions) {
              if (!effective[resource].includes(action)) {
                effective[resource].push(action);
              }
            }
          }
        }
      }
      return hasComplianceRequired(effective);
    })
    .map(({ member }) => member);
}
