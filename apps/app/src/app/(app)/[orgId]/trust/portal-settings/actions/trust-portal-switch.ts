// update-organization-name-action.ts

'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const trustPortalSwitchSchema = z.object({
  enabled: z.boolean(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  friendlyUrl: z.string().optional(),
  primaryColor: z.string().optional(),
});

export const trustPortalSwitchAction = authActionClient
  .inputSchema(trustPortalSwitchSchema)
  .metadata({
    name: 'trust-portal-switch',
    track: {
      event: 'trust-portal-switch',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { enabled, contactEmail, friendlyUrl, primaryColor } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      // Update Trust table
      await db.trust.upsert({
        where: {
          organizationId: activeOrganizationId,
        },
        update: {
          status: enabled ? 'published' : 'draft',
          contactEmail: contactEmail === '' ? null : contactEmail,
          friendlyUrl: friendlyUrl === '' ? null : friendlyUrl,
        },
        create: {
          organizationId: activeOrganizationId,
          status: enabled ? 'published' : 'draft',
          contactEmail: contactEmail === '' ? null : contactEmail,
          friendlyUrl: friendlyUrl === '' ? null : friendlyUrl,
        },
      });

      // Update Organization table with primaryColor if provided
      if (primaryColor !== undefined) {
        await db.organization.update({
          where: {
            id: activeOrganizationId,
          },
          data: {
            primaryColor: primaryColor === '' ? null : primaryColor,
          },
        });
      }

      revalidatePath(`/${activeOrganizationId}/trust`);
      revalidatePath(`/${activeOrganizationId}/trust/portal-settings`);
      revalidateTag(`organization_${activeOrganizationId}`, 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update trust portal settings');
    }
  });
