'use server';

import { createStripeCustomer } from '@/actions/organization/lib/create-stripe-customer';
import { getFrameworkNames } from '@/actions/organization/lib/get-framework-names';
import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { authActionClientWithoutOrg } from '@/actions/safe-action';
import { isHubSpotConfigured } from '@/hubspot/api-client';
import { createOrUpdateCompany, findCompanyByDomain } from '@/hubspot/companies';
import { findContactByEmail } from '@/hubspot/contacts';
import { createFleetLabelForOrg } from '@/jobs/tasks/device/create-fleet-label-for-org';
import { onboardOrganization as onboardOrganizationTask } from '@/jobs/tasks/onboarding/onboard-organization';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { tasks } from '@trigger.dev/sdk/v3';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { companyDetailsSchema, steps } from '../lib/constants';

export const createOrganization = authActionClientWithoutOrg
  .inputSchema(companyDetailsSchema)
  .metadata({
    name: 'create-organization',
    track: {
      event: 'create-organization',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        return {
          success: false,
          error: 'Not authorized.',
        };
      }

      // Create a new organization directly in the database
      const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();

      const newOrg = await db.organization.create({
        data: {
          name: parsedInput.organizationName,
          website: parsedInput.website,
          members: {
            create: {
              userId: session.user.id,
              role: 'owner',
            },
          },
          context: {
            create: steps
              .filter((step) => step.key !== 'organizationName' && step.key !== 'website')
              .map((step) => ({
                question: step.question,
                answer:
                  step.key === 'frameworkIds'
                    ? parsedInput.frameworkIds.join(', ')
                    : (parsedInput[step.key as keyof typeof parsedInput] as string),
                tags: ['onboarding'],
              })),
          },
        },
      });

      const orgId = newOrg.id;

      // Create HubSpot company if configured
      if (isHubSpotConfigured()) {
        try {
          console.log('[HubSpot] Creating company for organization:', orgId);

          // Extract domain from website URL
          let domain = '';
          try {
            const url = new URL(parsedInput.website);
            domain = url.hostname.replace('www.', '');
          } catch (e) {
            console.warn('[HubSpot] Could not parse website URL:', parsedInput.website);
          }

          // Check if company already exists
          let companyId: string | null = null;
          if (domain) {
            const existingCompany = await findCompanyByDomain(domain);
            companyId = existingCompany.companyId;
          }

          // Get framework names in lowercase snake_case format
          const frameworkNames = await getFrameworkNames(parsedInput.frameworkIds);

          // Extract employee count from the context answers
          let employeeCount = 0;
          const employeeCountAnswer = parsedInput.teamSize;
          if (employeeCountAnswer) {
            // Parse employee count range (e.g., "10-50" -> 30)
            const match = employeeCountAnswer.match(/(\d+)-(\d+)/);
            if (match) {
              employeeCount = Math.floor((parseInt(match[1]) + parseInt(match[2])) / 2);
            } else if (employeeCountAnswer.includes('+')) {
              employeeCount = parseInt(employeeCountAnswer.replace('+', ''));
            } else {
              employeeCount = parseInt(employeeCountAnswer) || 0;
            }
          }

          // Check if contact exists for this user
          const contactResult = await findContactByEmail(session.user.email);

          // Create or update company
          const hubspotCompanyId = await createOrUpdateCompany({
            companyName: parsedInput.organizationName,
            // Only pass companySize if we have a valid value
            ...(employeeCount > 0 && { companySize: employeeCount }),
            complianceNeeds: frameworkNames,
            existingCompanyId: companyId || undefined,
            domain,
            orgId,
          });

          if (hubspotCompanyId && contactResult.contactId) {
            // Associate contact with company
            console.log('[HubSpot] Company created/updated:', hubspotCompanyId);

            const { associateContactWithCompany } = await import('@/hubspot/contacts');
            await associateContactWithCompany({
              contactId: contactResult.contactId,
              companyId: hubspotCompanyId,
            });
            console.log('[HubSpot] Associated contact with company');
          }
        } catch (error) {
          console.error('[HubSpot] Error creating company:', error);
          // Don't throw - we don't want to block organization creation if HubSpot fails
        }
      }

      // Create onboarding record for new org
      await db.onboarding.create({
        data: {
          organizationId: orgId,
          triggerJobCompleted: false,
        },
      });

      // Create Stripe customer for new org
      const stripeCustomerId = await createStripeCustomer({
        name: parsedInput.organizationName,
        email: session.user.email,
        organizationId: orgId,
      });

      if (stripeCustomerId) {
        await db.organization.update({
          where: { id: orgId },
          data: { stripeCustomerId },
        });
      }

      // Initialize frameworks using the existing function
      if (parsedInput.frameworkIds && parsedInput.frameworkIds.length > 0) {
        await initializeOrganization({
          frameworkIds: parsedInput.frameworkIds,
          organizationId: orgId,
        });
      }

      // Set new org as active
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId: orgId,
        },
      });

      const userOrgs = await db.member.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          organizationId: true,
        },
      });

      for (const org of userOrgs) {
        revalidatePath(`/${org.organizationId}`);
      }

      const handle = await tasks.trigger<typeof onboardOrganizationTask>(
        'onboard-organization',
        {
          organizationId: orgId,
        },
        {
          queue: {
            name: 'onboard-organization',
            concurrencyLimit: 5,
          },
          concurrencyKey: orgId,
        },
      );

      // Set triggerJobId to signal that the job is running.
      await db.onboarding.update({
        where: {
          organizationId: orgId,
        },
        data: { triggerJobId: handle.id },
      });

      revalidatePath('/');
      revalidatePath(`/${orgId}`);
      revalidatePath('/setup');

      (await cookies()).set('publicAccessToken', handle.publicAccessToken);

      // Create Fleet Label.
      await tasks.trigger<typeof createFleetLabelForOrg>('create-fleet-label-for-org', {
        organizationId: orgId,
      });

      return {
        success: true,
        handle: handle.id,
        publicAccessToken: handle.publicAccessToken,
        organizationId: orgId,
      };
    } catch (error) {
      console.error('Error during organization creation/update:', error);

      // Return the actual error message for debugging
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Failed to create or update organization structure',
      };
    }
  });
