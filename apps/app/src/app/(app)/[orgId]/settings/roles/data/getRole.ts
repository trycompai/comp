import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import type { CustomRole } from '../components/RolesTable';

export async function getRole(roleId: string, organizationId: string): Promise<CustomRole | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const role = await db.organizationRole.findFirst({
    where: {
      id: roleId,
      organizationId,
    },
  });

  if (!role) {
    return null;
  }

  // Get member count by checking member.role field
  const memberCount = await db.member.count({
    where: {
      organizationId,
      role: {
        contains: role.name,
      },
    },
  });

  return {
    id: role.id,
    name: role.name,
    permissions: role.permissions as Record<string, string[]>,
    isBuiltIn: false,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    _count: {
      members: memberCount,
    },
  };
}
