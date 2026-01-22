'use server';

import { authActionClientWithoutOrg } from '@/actions/safe-action';
import { steps } from '@/app/(app)/setup/lib/constants';
import { createFleetLabelForOrg } from '@/trigger/tasks/device/create-fleet-label-for-org';
import { onboardOrganization as onboardOrganizationTask } from '@/trigger/tasks/onboarding/onboard-organization';
import { auth } from '@/utils/auth';
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
  cSuite: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
    }),
  ),
  reportSignatory: z.object({
    fullName: z.string(),
    jobTitle: z.string(),
    email: z.string(),
  }),
  devices: z.string().min(1),
  authentication: z.string().min(1),
  software: z.string().optional(),
  customVendors: z
    .array(
      z.object({
        name: z.string(),
        website: z.string().optional(),
      }),
    )
    .optional(),
  workLocation: z.string().min(1),
  infrastructure: z.string().min(1),
  dataTypes: z.string().min(1),
  geo: z.string().min(1),
  shipping: z.object({
    fullName: z.string(),
    address: z.string(),
    phone: z.string(),
  }),
});

export const completeOnboarding = authActionClientWithoutOrg
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
      // Verify user has access to this organization
      const member = await db.member.findFirst({
        where: {
          userId: ctx.user.id,
          organizationId: parsedInput.organizationId,
          deactivated: false,
        },
      });

      if (!member) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      // Ensure the newly onboarded org is the active org.
      // This prevents the "Setting up your organization" flow from accidentally using a previous org session.
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId: parsedInput.organizationId,
        },
      });

      // Save the remaining steps to context
      const postPaymentSteps = steps.slice(3); // Steps 4-12
      const contextData = postPaymentSteps
        .filter((step) => {
          const value = parsedInput[step.key as keyof typeof parsedInput];
          // Filter out steps that aren't in parsedInput or have empty values (skipped steps)
          if (!(step.key in parsedInput)) return false;
          if (value === undefined || value === null || value === '') return false;
          return true;
        })
        .map((step) => ({
          question: step.question,
          answer:
            typeof parsedInput[step.key as keyof typeof parsedInput] === 'object'
              ? JSON.stringify(parsedInput[step.key as keyof typeof parsedInput])
              : (parsedInput[step.key as keyof typeof parsedInput] as string),
          tags: ['onboarding'],
          organizationId: parsedInput.organizationId,
        }));

      // Add customVendors to context if present (for vendor risk assessment with URLs)
      if (parsedInput.customVendors && parsedInput.customVendors.length > 0) {
        contextData.push({
          question: 'What are your custom vendors and their websites?',
          answer: JSON.stringify(parsedInput.customVendors),
          tags: ['onboarding'],
          organizationId: parsedInput.organizationId,
        });

        // Add custom vendors to GlobalVendors immediately (if they have URLs and don't exist)
        // This allows other organizations to benefit from user-contributed vendor data
        for (const vendor of parsedInput.customVendors) {
          if (vendor.website && vendor.website.trim()) {
            try {
              // Check if vendor with same name already exists in GlobalVendors
              const existingGlobalVendor = await db.globalVendors.findFirst({
                where: {
                  company_name: {
                    equals: vendor.name,
                    mode: 'insensitive',
                  },
                },
              });

              if (!existingGlobalVendor) {
                // Create new GlobalVendor entry (approved: false for review)
                await db.globalVendors.create({
                  data: {
                    website: vendor.website,
                    company_name: vendor.name,
                    approved: false,
                  },
                });
                console.log(`Added custom vendor to GlobalVendors: ${vendor.name}`);
              }
            } catch (error) {
              // Log but don't fail - GlobalVendors is a nice-to-have
              console.warn(`Failed to add vendor ${vendor.name} to GlobalVendors:`, error);
            }
          }
        }
      }

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
