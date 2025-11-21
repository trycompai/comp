'use server';

import { db } from '@db';
import { authActionClient } from '../safe-action';

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

export const getOrganizationUsersAction = authActionClient
  .metadata({
    name: 'get-organization-users',
  })
  .action(
    async ({ parsedInput, ctx }): Promise<{ success: boolean; error?: string; data?: User[] }> => {
      if (!ctx.session.activeOrganizationId) {
        return {
          success: false,
          error: 'User does not have an organization',
        };
      }

      try {
        const users = await db.member.findMany({
          where: {
            organizationId: ctx.session.activeOrganizationId,
            deactivated: false,
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            user: {
              name: 'asc',
            },
          },
        });

        return {
          success: true,
          data: users.map((user) => ({
            id: user.user.id,
            name: user.user.name || '',
            image: user.user.image || '',
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to fetch organization users',
        };
      }
    },
  );
