'use server';

import { createStripeCustomer } from '@/actions/organization/lib/create-stripe-customer';
import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { authActionClientWithoutOrg } from '@/actions/safe-action';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const createOrganizationMinimalSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  website: z.string().url('Please enter a valid URL'),
  frameworkIds: z.array(z.string()).default([]),
});

export const createOrganizationMinimal = authActionClientWithoutOrg
  .inputSchema(createOrganizationMinimalSchema)
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
        },
      });

      const orgId = newOrg.id;

      // Create onboarding record for new org (mark as completed since they're skipping)
      await db.onboarding.create({
        data: {
          organizationId: orgId,
          completed: true,
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

      // Initialize frameworks if provided
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

      revalidatePath('/');
      revalidatePath(`/${orgId}`);
      revalidatePath('/setup');

      return {
        success: true,
        organizationId: orgId,
      };
    } catch (error) {
      console.error('Error during organization setup:', error);

      // Return the actual error message for debugging
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Failed to setup organization',
      };
    }
  });
