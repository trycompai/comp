'use server';

import { createStripeCustomer } from '@/actions/organization/lib/create-stripe-customer';
import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { authActionClientWithoutOrg } from '@/actions/safe-action';
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

      // Create onboarding record for new org
      await db.onboarding.create({
        data: {
          organizationId: orgId,
          completed: false,
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
