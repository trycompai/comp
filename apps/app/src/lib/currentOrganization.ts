'use server';

import { auth } from '@/utils/auth';
import type { Organization } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';

export async function getCurrentOrganization({
  requestedOrgId,
}: {
  requestedOrgId: string;
}): Promise<Organization | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const activeOrgId = session?.session?.activeOrganizationId;
  const userId = session?.session?.userId;

  if (requestedOrgId === activeOrgId) {
    return db.organization.findFirst({
      where: {
        id: activeOrgId,
      },
    });
  }

  return db.organization.findFirst({
    where: {
      id: requestedOrgId,
      members: { some: { userId } },
    },
  });
}
