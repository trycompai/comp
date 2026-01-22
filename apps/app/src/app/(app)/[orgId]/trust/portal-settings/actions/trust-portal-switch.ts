'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { Prisma } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

const trustPortalSwitchSchema = z.object({
  enabled: z.boolean(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  primaryColor: z.string().optional(),
});

/**
 * Create a URL-friendly slug from organization name
 */
const slugifyOrganizationName = (name: string): string => {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return cleaned.slice(0, 60);
};

/**
 * Ensure organization has a friendlyUrl, create one if missing
 */
const ensureFriendlyUrl = async (params: {
  organizationId: string;
  organizationName: string;
}): Promise<string> => {
  const { organizationId, organizationName } = params;

  const current = await db.trust.findUnique({
    where: { organizationId },
    select: { friendlyUrl: true },
  });

  if (current?.friendlyUrl) return current.friendlyUrl;

  const baseCandidate =
    slugifyOrganizationName(organizationName) || `org-${organizationId.slice(-8)}`;

  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? baseCandidate : `${baseCandidate}-${i + 1}`;

    const taken = await db.trust.findUnique({
      where: { friendlyUrl: candidate },
      select: { organizationId: true },
    });

    if (taken && taken.organizationId !== organizationId) continue;

    try {
      await db.trust.upsert({
        where: { organizationId },
        update: { friendlyUrl: candidate },
        create: { organizationId, friendlyUrl: candidate },
      });
      return candidate;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        continue;
      }
      throw error;
    }
  }

  return organizationId;
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
    const { enabled, contactEmail, primaryColor } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      // Get organization name for friendlyUrl generation
      const org = await db.organization.findUnique({
        where: { id: activeOrganizationId },
        select: { name: true },
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      // Ensure friendlyUrl exists when enabling the portal
      if (enabled) {
        await ensureFriendlyUrl({
          organizationId: activeOrganizationId,
          organizationName: org.name,
        });
      }

      // Update Trust table
      await db.trust.upsert({
        where: {
          organizationId: activeOrganizationId,
        },
        update: {
          status: enabled ? 'published' : 'draft',
          contactEmail: contactEmail === '' ? null : contactEmail,
        },
        create: {
          organizationId: activeOrganizationId,
          status: enabled ? 'published' : 'draft',
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
