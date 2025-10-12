'use server';

import { authActionClient } from '@/actions/safe-action';
import { steps } from '@/app/(app)/setup/lib/constants';
import { createFleetLabelForOrg } from '@/jobs/tasks/device/create-fleet-label-for-org';
import { onboardOrganization as onboardOrganizationTask } from '@/jobs/tasks/onboarding/onboard-organization';
import { db } from '@db';
import { tasks } from '@trigger.dev/sdk';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';

// Schema for the remaining fields (steps 4-12)
const onboardingCompletionSchema = z.object({
  organizationId: z.string(),
  describe: z.string().min(1).max(300),
  industry: z.string().min(1),
  teamSize: z.string().min(1),
  devices: z.string().min(1),
  authentication: z.string().min(1),
  software: z.string().min(1),
  workLocation: z.string().min(1),
  infrastructure: z.string().min(1),
  dataTypes: z.string().min(1),
  geo: z.string().min(1),
  shipping: z
    .object({
      fullName: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});

export const completeOnboarding = authActionClient
  .inputSchema(onboardingCompletionSchema)
  .metadata({
    name: 'complete-onboarding',
    track: {
      event: 'complete-onboarding',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    try {
      const { activeOrganizationId } = ctx.session;

      // Verify the organization ID matches the active org
      if (parsedInput.organizationId !== activeOrganizationId) {
        return {
          success: false,
          error: 'Organization mismatch',
        };
      }

      // Verify user has access to this organization
      const member = await db.member.findFirst({
        where: {
          userId: ctx.user.id,
          organizationId: parsedInput.organizationId,
        },
      });

      if (!member) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      // Save the remaining steps to context
      const postPaymentSteps = steps.slice(3); // Steps 4-12
      const contextData = postPaymentSteps
        .filter((step) => step.key in parsedInput)
        .map((step) => ({
          question: step.question,
          answer:
            typeof parsedInput[step.key as keyof typeof parsedInput] === 'object'
              ? JSON.stringify(parsedInput[step.key as keyof typeof parsedInput])
              : (parsedInput[step.key as keyof typeof parsedInput] as string),
          tags: ['onboarding'],
          organizationId: parsedInput.organizationId,
        }));
      await db.context.createMany({ data: contextData });

      // Update organization to mark onboarding as complete
      await db.organization.update({
        where: { id: parsedInput.organizationId },
        data: { onboardingCompleted: true },
      });

      // Now trigger the jobs that were skipped during minimal creation
      const handle = await tasks.trigger<typeof onboardOrganizationTask>('onboard-organization', {
        organizationId: parsedInput.organizationId,
      });

      // Update onboarding record with job ID
      await db.onboarding.update({
        where: {
          organizationId: parsedInput.organizationId,
        },
        data: { triggerJobId: handle.id },
      });

      // Set cookie for job tracking
      (await cookies()).set('publicAccessToken', handle.publicAccessToken);

      // Create Fleet Label
      await tasks.trigger<typeof createFleetLabelForOrg>('create-fleet-label-for-org', {
        organizationId: parsedInput.organizationId,
      });

      // Revalidate paths
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      revalidatePath('/');
      revalidatePath(`/${parsedInput.organizationId}`);

      return {
        success: true,
        handle: handle.id,
        publicAccessToken: handle.publicAccessToken,
        organizationId: parsedInput.organizationId,
        redirectUrl: `/${parsedInput.organizationId}/`,
      };
    } catch (error) {
      console.error('Error completing onboarding:', error);

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Failed to complete onboarding',
      };
    }
  });
