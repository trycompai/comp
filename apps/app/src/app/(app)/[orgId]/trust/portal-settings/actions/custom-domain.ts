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

      console.log(`Adding domain to Vercel project: ${domain}`);

      const addDomainToProject = await vercel.projects.addProjectDomain({
        idOrName: env.TRUST_PORTAL_PROJECT_ID!,
        teamId: env.VERCEL_TEAM_ID!,
        slug: env.TRUST_PORTAL_PROJECT_ID!,
        requestBody: {
          name: domain,
        },
      });

      console.log(`Vercel response for ${domain}:`, JSON.stringify(addDomainToProject, null, 2));

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
      console.error('Custom domain error:', error);

      // Handle Vercel SDK errors
      if (error instanceof Error) {
        const vercelError = error as Error & {
          statusCode?: number;
          body?: string;
        };

        // Check for 409 domain_already_in_use - domain exists on our project with pending verification
        if (vercelError.statusCode === 409 && vercelError.body) {
          // Parse error body separately to avoid catching db/revalidation errors
          let errorBody: { error?: { code?: string; projectId?: string; domain?: { verified?: boolean; verification?: Array<{ value?: string }> } } } | null = null;
          try {
            errorBody = JSON.parse(vercelError.body);
          } catch (parseError) {
            console.error('Failed to parse Vercel error body:', parseError);
          }

          const errorData = errorBody?.error;

          if (
            errorData?.code === 'domain_already_in_use' &&
            errorData?.projectId === env.TRUST_PORTAL_PROJECT_ID
          ) {
            // Check if another organization already owns this domain in our database
            const existingDomainOwner = await db.trust.findFirst({
              where: {
                domain,
                organizationId: { not: activeOrganizationId },
              },
              select: { organizationId: true },
            });

            if (existingDomainOwner) {
              return {
                success: false,
                error: 'Domain is already in use by another organization',
              };
            }

            // Domain already exists on our project - extract verification info and save it
            const domainInfo = errorData.domain;
            const vercelVerification = domainInfo?.verification?.[0]?.value || null;
            // Default to true since we're in the pending verification handler
            const isVercelDomain = domainInfo?.verified !== true;

            console.log(
              `Domain ${domain} already exists on project, extracting verification info:`,
              vercelVerification,
            );

            await db.trust.upsert({
              where: { organizationId: activeOrganizationId },
              update: {
                domain,
                domainVerified: false,
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
              needsVerification: true,
            };
          }
        }

        // Extract meaningful error message for other errors
        let errorMessage = 'Failed to update custom domain';
        const typedError = error as Error & {
          body?: string;
        };

        if (typedError.body) {
          try {
            const parsed = JSON.parse(typedError.body);
            errorMessage = parsed?.error?.message || errorMessage;
          } catch {
            errorMessage = typedError.message || errorMessage;
          }
        } else if (typedError.message) {
          errorMessage = typedError.message;
        }

        throw new Error(errorMessage);
      }

      throw new Error('Failed to update custom domain');
    }
  });
