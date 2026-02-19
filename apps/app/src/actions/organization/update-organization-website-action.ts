// update-organization-name-action.ts

'use server';

import { db } from '@db';
import { revalidatePath, revalidateTag } from 'next/cache';
import { authActionClient } from '../safe-action';
import { organizationWebsiteSchema } from '../schema';

export const updateOrganizationWebsiteAction = authActionClient
  .inputSchema(organizationWebsiteSchema)
  .metadata({
    name: 'update-organization-website',
    track: {
      event: 'update-organization-website',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { website } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!website) {
      throw new Error('Invalid user input');
    }

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.organization.update({
          where: { id: activeOrganizationId ?? '' },
          data: { website },
        });

        // Keep website integration connection in sync
        const websiteProvider = await tx.integrationProvider.findUnique({
          where: { slug: 'website' },
        });
        if (websiteProvider) {
          const existing = await tx.integrationConnection.findFirst({
            where: {
              providerId: websiteProvider.id,
              organizationId: activeOrganizationId,
            },
          });
          if (existing) {
            await tx.integrationConnection.update({
              where: { id: existing.id },
              data: {
                status: 'active',
                variables: { website },
              },
            });
          } else {
            await tx.integrationConnection.create({
              data: {
                providerId: websiteProvider.id,
                organizationId: activeOrganizationId,
                status: 'active',
                authStrategy: 'custom',
                variables: { website },
              },
            });
          }
        }
      });

      revalidatePath('/settings');
      revalidateTag(`organization_${activeOrganizationId}`, 'max');

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update organization website');
    }
  });
