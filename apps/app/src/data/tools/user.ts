import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { z } from 'zod';

export function getUserTools() {
  return {
    getUser,
  };
}

export const getUser = {
  description: "Get the user's id and organization id",
  inputSchema: z.object({}),
  execute: async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.session.activeOrganizationId) {
      return { error: 'Unauthorized' };
    }

    return {
      userId: session.user.id,
      organizationId: session.session.activeOrganizationId,
    };
  },
};
