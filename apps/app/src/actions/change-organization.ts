'use server';

import { auth } from '@/utils/auth';
import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { authActionClient } from './safe-action';

export const changeOrganizationAction = authActionClient
  .inputSchema(
    z.object({
      organizationId: z.string(),
    }),
  )
  .metadata({
    name: 'change-organization',
    track: {
      event: 'create-employee',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = parsedInput;
    const { user } = ctx;

    const organizationMember = await db.member.findFirst({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (!organizationMember) {
      const t = await getGT();
      return {
        success: false,
        error: t('Unauthorized'),
      };
    }

    try {
      const organization = await db.organization.findUnique({
        where: {
          id: organizationId,
        },
      });

      if (!organization) {
        const t = await getGT();
        return {
          success: false,
          error: t('Organization not found'),
        };
      }

      auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId: organization.id,
        },
      });

      revalidatePath(`/${organization.id}`);

      return {
        success: true,
        data: organization,
      };
    } catch (error) {
      console.error('Error changing organization:', error);

      const t = await getGT();
      return {
        success: false,
        error: t('Failed to change organization'),
      };
    }
  });
