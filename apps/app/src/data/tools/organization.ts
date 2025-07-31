import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { z } from 'zod';

export function getOrganizationTools() {
  return {
    findOrganization,
  };
}

export const findOrganization = {
  description: "Find the users organization and it's details",
  inputSchema: z.object({}),
  execute: async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.session.activeOrganizationId) {
      return { error: 'Unauthorized' };
    }

    const org = await db.organization.findUnique({
      where: { id: session.session.activeOrganizationId },
      select: {
        name: true,
      },
    });

    if (!org) {
      return {
        organization: null,
        message: 'Organization not found',
      };
    }

    return {
      organization: org,
    };
  },
};
