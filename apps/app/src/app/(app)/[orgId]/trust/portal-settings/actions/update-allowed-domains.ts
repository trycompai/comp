'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;

const updateAllowedDomainsSchema = z.object({
  allowedDomains: z.array(
    z
      .string()
      .min(1, 'Domain cannot be empty')
      .regex(domainRegex, 'Invalid domain format')
      .transform((d) => d.toLowerCase().trim()),
  ),
});

export const updateAllowedDomainsAction = authActionClient
  .inputSchema(updateAllowedDomainsSchema)
  .metadata({
    name: 'update-allowed-domains',
    track: {
      event: 'update-allowed-domains',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { allowedDomains } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    // Remove duplicates
    const uniqueDomains = [...new Set(allowedDomains)];

    await db.trust.upsert({
      where: {
        organizationId: activeOrganizationId,
      },
      update: {
        allowedDomains: uniqueDomains,
      },
      create: {
        organizationId: activeOrganizationId,
        allowedDomains: uniqueDomains,
      },
    });

    revalidatePath(`/${activeOrganizationId}/trust`);
    revalidatePath(`/${activeOrganizationId}/trust/portal-settings`);

    return {
      success: true,
      allowedDomains: uniqueDomains,
    };
  });
