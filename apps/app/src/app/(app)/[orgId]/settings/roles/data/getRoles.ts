import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import type { CustomRole } from '../components/RolesTable';

export async function getRoles(organizationId: string): Promise<CustomRole[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return [];
  }

  const roles = await db.organizationRole.findMany({
    where: {
      organizationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Get member counts for each role by checking member.role field
  const memberCounts = await Promise.all(
    roles.map(async (role) => {
      const count = await db.member.count({
        where: {
          organizationId,
          role: {
            contains: role.name,
          },
        },
      });
      return { roleId: role.id, count };
    })
  );

  const countMap = new Map(memberCounts.map((mc) => [mc.roleId, mc.count]));

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: (typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions) as Record<string, string[]>,
    isBuiltIn: false,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
    _count: {
      members: countMap.get(role.id) ?? 0,
    },
  }));
}
