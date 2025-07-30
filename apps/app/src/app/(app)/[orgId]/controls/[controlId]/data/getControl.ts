import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';

export const getControl = async (id: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      error: 'Unauthorized',
    };
  }

  if (!session.session.activeOrganizationId) {
    return {
      error: 'Unauthorized',
    };
  }

  const control = await db.control.findUnique({
    where: {
      organizationId: session.session.activeOrganizationId,
      id,
    },
    include: {
      requirementsMapped: {
        include: {
          frameworkInstance: {
            include: {
              framework: true,
            },
          },
          requirement: true,
        },
      },
      tasks: true,
    },
  });

  return control;
};
