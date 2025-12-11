// custom-domain-action.ts

'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { Vercel } from '@vercel/sdk';
import { revalidatePath, revalidateTag } from 'next/cache';
import { env } from 'node:process';
import { z } from 'zod';

const customDomainSchema = z.object({
  domain: z.string().min(1),
});

const vercel = new Vercel({
  bearerToken: env.VERCEL_ACCESS_TOKEN,
});

export const customDomainAction = authActionClient
  .inputSchema(customDomainSchema)
  .metadata({
    name: 'custom-domain',
    track: {
      event: 'add-custom-domain',
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
      const currentDomain = await db.trust.findUnique({
        where: { organizationId: activeOrganizationId },
      });

      const domainVerified =
        currentDomain?.domain === domain ? currentDomain.domainVerified : false;

      const isExistingRecord = await vercel.projects.getProjectDomains({
        idOrName: env.TRUST_PORTAL_PROJECT_ID!,
        teamId: env.VERCEL_TEAM_ID!,
      });

      if (isExistingRecord.domains.some((record) => record.name === domain)) {
        const domainOwner = await db.trust.findUnique({
          where: {
            organizationId: activeOrganizationId,
            domain: domain,
          },
        });

        if (!domainOwner || domainOwner.organizationId === activeOrganizationId) {
          await vercel.projects.removeProjectDomain({
            idOrName: env.TRUST_PORTAL_PROJECT_ID!,
            teamId: env.VERCEL_TEAM_ID!,
            domain,
          });
        } else {
          return {
            success: false,
            error: 'Domain is already in use by another organization',
          };
        }
      }

      const addDomainToProject = await vercel.projects.addProjectDomain({
        idOrName: env.TRUST_PORTAL_PROJECT_ID!,
        teamId: env.VERCEL_TEAM_ID!,
        slug: env.TRUST_PORTAL_PROJECT_ID!,
        requestBody: {
          name: domain,
        },
      });

      const isVercelDomain = addDomainToProject.verified === false;

      // Store the verification details from Vercel if available
      const vercelVerification = addDomainToProject.verification?.[0]?.value || null;

      await db.trust.upsert({
        where: { organizationId: activeOrganizationId },
        update: {
          domain,
          domainVerified,
          isVercelDomain,
          vercelVerification,
        },
        create: {
          organizationId: activeOrganizationId,
          domain,
          domainVerified: false,
          isVercelDomain,
          vercelVerification,
        },
      });

      revalidatePath(`/${activeOrganizationId}/trust`);
      revalidatePath(`/${activeOrganizationId}/trust/portal-settings`);
      revalidateTag(`organization_${activeOrganizationId}`, 'max');

      return {
        success: true,
        needsVerification: !domainVerified,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update custom domain');
    }
  });
