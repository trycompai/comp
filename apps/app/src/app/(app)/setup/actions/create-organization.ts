'use server';

import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { authActionClientWithoutOrg } from '@/actions/safe-action';
import { createFleetLabelForOrg } from '@/jobs/tasks/device/create-fleet-label-for-org';
import { onboardOrganization as onboardOrganizationTask } from '@/jobs/tasks/onboarding/onboard-organization';
import { createOnePasswordLoginItem } from '@/lib/browserbase/onepassword';
import { createTrainingVideoEntries } from '@/lib/db/employee';
import { provisionOrgMailbox } from '@/lib/mail/provisionMailbox';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { tasks } from '@trigger.dev/sdk';
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

      // Provision org mailbox and save to 1Password
      try {
        const { email, password } = await provisionOrgMailbox({
          organizationId: orgId,
          notifyEmail: session.user.email ?? undefined,
        });
        await createOnePasswordLoginItem({
          organizationId: orgId,
          username: email,
          password,
          titleSuffix: 'Org Mailbox',
        });
      } catch (e) {
        console.error('Mailbox provisioning failed', e);
        // Continue onboarding even if mailbox fails, but surface error in logs
      }

      // Get the member that was created with the organization (the owner)
      const ownerMember = await db.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: orgId,
        },
      });

      // Create training video completion entries for the owner
      if (ownerMember) {
        await createTrainingVideoEntries(ownerMember.id);
      }

      // Create onboarding record for new org
      await db.onboarding.create({
        data: {
          organizationId: orgId,
          triggerJobCompleted: false,
        },
      });

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

      const handle = await tasks.trigger<typeof onboardOrganizationTask>('onboard-organization', {
        organizationId: orgId,
      });

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
