import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';

/**
 * Gets the current user's member record
 * @returns Promise<Member | null> - the member record or null if not found
 */
async function getCurrentMember() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user?.id || !session?.session?.activeOrganizationId) {
      return null;
    }

    const member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: session.session.activeOrganizationId,
      },
    });

    return member;
  } catch {
    return null;
  }
}

/**
 * Helper function to parse comma-separated roles
 * @param roleString - comma-separated roles string
 * @returns array of individual roles
 */
function parseRoles(roleString?: string | null): string[] {
  if (!roleString) return [];
  return roleString.split(',').map((role) => role.trim());
}

/**
 * Checks if the current user has strictly readonly role (only 'readonly', no other roles)
 * @returns Promise<boolean> - true if user has only readonly role, false otherwise
 */
export async function isReadOnlyUser(): Promise<boolean> {
  try {
    const member = await getCurrentMember();
    return member?.role === 'readonly';
  } catch {
    // If we can't get the member info, assume readonly for safety
    return true;
  }
}

/**
 * Checks if the current user can perform write operations
 * @returns Promise<boolean> - true if user can write, false if readonly
 */
export async function canWrite(): Promise<boolean> {
  const isReadOnly = await isReadOnlyUser();
  return !isReadOnly;
}

/**
 * Gets the current user's roles as an array
 * @returns Promise<string[]> - array of user roles or empty array if not found
 */
export async function getCurrentUserRoles(): Promise<string[]> {
  try {
    const member = await getCurrentMember();
    return parseRoles(member?.role);
  } catch {
    return [];
  }
}

/**
 * Gets the current user's role string (for backward compatibility)
 * @returns Promise<string | null> - the user's role string or null if not found
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const member = await getCurrentMember();
    return member?.role || null;
  } catch {
    return null;
  }
}

/**
 * Checks if the current user has a specific role
 * @param role - the role to check for
 * @returns Promise<boolean> - true if user has the role, false otherwise
 */
export async function hasRole(role: string): Promise<boolean> {
  try {
    const userRoles = await getCurrentUserRoles();
    return userRoles.includes(role);
  } catch {
    return false;
  }
}

/**
 * Checks if the current user has any of the specified roles
 * @param roles - array of roles to check for
 * @returns Promise<boolean> - true if user has any of the roles, false otherwise
 */
export async function hasAnyRole(roles: string[]): Promise<boolean> {
  try {
    const userRoles = await getCurrentUserRoles();
    return roles.some((role) => userRoles.includes(role));
  } catch {
    return false;
  }
}
