import { getServersideSession } from '@/lib/get-session';
import { db } from '@db';
import { headers } from 'next/headers';
import { cache } from 'react';

export const getUsers = cache(async () => {
  const session = await getServersideSession({
    headers: await headers(),
  });

  if (!session || !session.session.activeOrganizationId) {
    return [];
  }

  const users = await db.member.findMany({
    where: { organizationId: session.session.activeOrganizationId },
    include: {
      user: true,
    },
  });

  return users.map((user) => user.user);
});
