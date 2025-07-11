'use server';

import { createStripeCustomer } from '@/actions/organization/lib/create-stripe-customer';
import { getFrameworkNames } from '@/actions/organization/lib/get-framework-names';
import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { authActionClientWithoutOrg } from '@/actions/safe-action';
import { isHubSpotConfigured } from '@/hubspot/api-client';
import { createOrUpdateCompany, findCompanyByDomain } from '@/hubspot/companies';
import { findContactByEmail } from '@/hubspot/contacts';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

// Minimal schema - only the first 3 fields
const minimalOrgSchema = z.object({
  frameworkIds: z.array(z.string()).min(1, 'Please select at least one framework'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  website: z.string().url('Please enter a valid URL'),
});

export const createOrganizationMinimal = authActionClientWithoutOrg
  .inputSchema(minimalOrgSchema)
  .metadata({
    name: 'create-organization-minimal',
    track: {
      event: 'create-organization-minimal',
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

      // Create a new organization
      const newOrg = await db.organization.create({
        data: {
          name: parsedInput.organizationName,
          website: parsedInput.website,
          onboardingCompleted: false, // Explicitly set to false
          members: {
            create: {
              userId: session.user.id,
              role: 'owner',
            },
          },
          // Only save the context for frameworkIds (we need this for later)
          context: {
            create: {
              question: 'Which compliance frameworks do you need?',
              answer: parsedInput.frameworkIds.join(', '),
              tags: ['onboarding'],
            },
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

          // Check if contact exists for this user
          const contactResult = await findContactByEmail(session.user.email);

          // Create or update company
          const hubspotCompanyId = await createOrUpdateCompany({
            companyName: parsedInput.organizationName,
            // Don't pass companySize - we don't have employee count in minimal setup
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

      // Initialize frameworks - this sets up the structure immediately
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

      // Revalidate paths
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      revalidatePath('/');
      revalidatePath('/setup');

      // NO JOB TRIGGERS - that happens after payment in complete-onboarding

      return {
        success: true,
        organizationId: orgId,
      };
    } catch (error) {
      console.error('Error during minimal organization creation:', error);

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Failed to create organization',
      };
    }
  });
