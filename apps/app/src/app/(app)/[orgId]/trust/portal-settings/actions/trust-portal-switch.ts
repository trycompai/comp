'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { Prisma } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const trustPortalSwitchSchema = z.object({
  contactEmail: z.string().email().optional().or(z.literal('')),
  primaryColor: z.string().optional(),
});

/**
 * Ensure organization has a friendlyUrl, defaulting to organizationId
 */
const ensureFriendlyUrl = async (organizationId: string): Promise<string> => {
  const current = await db.trust.findUnique({
    where: { organizationId },
    select: { friendlyUrl: true },
  });

  if (current?.friendlyUrl) return current.friendlyUrl;

  // Use organizationId as the default friendlyUrl (guaranteed unique)
  try {
    await db.trust.upsert({
      where: { organizationId },
      update: { friendlyUrl: organizationId },
      create: { organizationId, friendlyUrl: organizationId },
    });
    return organizationId;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      // If somehow there's a conflict, the friendlyUrl already exists
      const existing = await db.trust.findUnique({
        where: { organizationId },
        select: { friendlyUrl: true },
      });
      return existing?.friendlyUrl ?? organizationId;
    }
    throw error;
  }
};

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
    const { contactEmail, primaryColor } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      // Ensure friendlyUrl exists (defaults to organizationId)
      await ensureFriendlyUrl(activeOrganizationId);

      // Update Trust table (always published now)
      await db.trust.upsert({
        where: {
          organizationId: activeOrganizationId,
        },
        update: {
          status: 'published',
          contactEmail: contactEmail === '' ? null : contactEmail,
        },
        create: {
          organizationId: activeOrganizationId,
          status: 'published',
          contactEmail: contactEmail === '' ? null : contactEmail,
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
