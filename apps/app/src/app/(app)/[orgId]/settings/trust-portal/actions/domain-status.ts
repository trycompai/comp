'use server';

import { authActionClient } from '@/actions/safe-action';
import { Vercel } from '@vercel/sdk';
import { revalidatePath, revalidateTag } from 'next/cache';
import { env } from 'node:process';
import { z } from 'zod';

const domainStatusSchema = z.object({
  domain: z.string().min(1),
});

const vercel = new Vercel({
  bearerToken: env.VERCEL_ACCESS_TOKEN,
});

export const domainStatusAction = authActionClient
  .inputSchema(domainStatusSchema)
  .metadata({
    name: 'domain-status',
    track: {
      event: 'check-domain-status',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { domain } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      throw new Error('No active organization');
    }

    try {
      // Get domain information including verification status
      const domainInfo = await vercel.projects.getProjectDomain({
        idOrName: env.TRUST_PORTAL_PROJECT_ID!,
        domain,
        teamId: env.VERCEL_TEAM_ID!,
      });

      revalidatePath(`/${activeOrganizationId}/settings/trust-portal`);
      revalidateTag(`organization_${activeOrganizationId}`);

      return {
        success: true,
        domain: domainInfo.name,
        verified: domainInfo.verified,
        verification: domainInfo.verification?.map((v) => ({
          type: v.type,
          domain: v.domain,
          value: v.value,
          reason: v.reason,
        })),
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to get domain status');
    }
  });
