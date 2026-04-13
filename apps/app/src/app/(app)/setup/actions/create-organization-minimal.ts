'use server';

import { initializeOrganization } from '@/actions/organization/lib/initialize-organization';
import { authActionClientWithoutOrg } from '@/actions/safe-action';
import { env } from '@/env.mjs';
import { createTrainingVideoEntries } from '@/lib/db/employee';
import { auth } from '@/utils/auth';
import { db } from '@db/server';
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
    let createdOrgId: string | undefined;

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

      // Check if user email domain is trycomp.ai
      const userEmail = session.user.email;
      const isTryCompEmail = userEmail?.endsWith('@trycomp.ai') ?? false;

      // Check if self-hosted
      const isSelfHosted = env.NEXT_PUBLIC_SELF_HOSTED === 'true';

      // Idempotency: if the user already has a recently created org with the
      // same name that hasn't completed onboarding, reuse it instead of
      // creating a duplicate (protects against retry/refresh during redirect).
      const existingOrg = await db.organization.findFirst({
        where: {
          name: parsedInput.organizationName,
          onboardingCompleted: false,
          members: {
            some: {
              userId: session.user.id,
              role: 'owner',
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingOrg) {
        // Ensure post-creation steps are completed in case the original
        // request failed partway through (after DB insert but before
        // onboarding record or framework initialization).
        const existingOnboarding = await db.onboarding.findUnique({
          where: { organizationId: existingOrg.id },
        });

        if (!existingOnboarding) {
          await db.onboarding.create({
            data: {
              organizationId: existingOrg.id,
              triggerJobCompleted: false,
            },
          });
        }

        if (parsedInput.frameworkIds && parsedInput.frameworkIds.length > 0) {
          const existingFrameworks = await db.frameworkInstance.findFirst({
            where: { organizationId: existingOrg.id },
          });

          if (!existingFrameworks) {
            await initializeOrganization({
              frameworkIds: parsedInput.frameworkIds,
              organizationId: existingOrg.id,
            });
          }
        }

        // Ensure this org is set as the active one
        await auth.api.setActiveOrganization({
          headers: await headers(),
          body: {
            organizationId: existingOrg.id,
          },
        });

        return {
          success: true,
          organizationId: existingOrg.id,
        };
      }

      // Resolve framework IDs to display names (e.g. "SOC 2", "ISO 27001")
      const frameworks = await db.frameworkEditorFramework.findMany({
        where: { id: { in: parsedInput.frameworkIds } },
        select: { name: true },
      });
      const frameworkNames = frameworks.map((f) => f.name).join(', ');

      // Create a new organization
      const newOrg = await db.organization.create({
        data: {
          name: parsedInput.organizationName,
          website: parsedInput.website,
          onboardingCompleted: false, // Explicitly set to false
          // Auto-enable for trycomp.ai emails, local development, or self-hosted instances
          ...((process.env.NEXT_PUBLIC_APP_ENV !== 'production' ||
            isTryCompEmail ||
            isSelfHosted) && {
            hasAccess: true,
          }),
          members: {
            create: {
              userId: session.user.id,
              role: 'owner',
            },
          },
          // Save framework context: display names for AI prompts + raw IDs for recovery
          context: {
            createMany: {
              data: [
                {
                  question: 'Which compliance frameworks do you need?',
                  answer: frameworkNames || parsedInput.frameworkIds.join(', '),
                  tags: ['onboarding'],
                },
                {
                  question: 'frameworkIds',
                  answer: JSON.stringify(parsedInput.frameworkIds),
                  tags: ['onboarding'],
                },
              ],
            },
          },
        },
      });

      const orgId = newOrg.id;
      createdOrgId = orgId;

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

      // Initialize frameworks - this sets up the structure immediately
      if (parsedInput.frameworkIds && parsedInput.frameworkIds.length > 0) {
        await initializeOrganization({
          frameworkIds: parsedInput.frameworkIds,
          organizationId: orgId,
        });
      }

      // Set new org as active — after this point, the session references
      // the org so we must NOT delete it on cleanup.
      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId: orgId,
        },
      });
      createdOrgId = undefined; // Org is fully initialized, disable cleanup

      // Revalidate paths (non-critical, don't let failures kill the flow)
      try {
        const headersList = await headers();
        let path = headersList.get('x-pathname') || headersList.get('referer') || '';
        path = path.replace(/\/[a-z]{2}\//, '/');

        revalidatePath(path);
        revalidatePath('/');
        revalidatePath('/setup');
      } catch (revalidateError) {
        console.error('Non-critical: failed to revalidate paths:', revalidateError);
      }

      // NO JOB TRIGGERS - that happens after payment in complete-onboarding

      return {
        success: true,
        organizationId: orgId,
      };
    } catch (error) {
      console.error('Error during minimal organization creation:', error);

      // Clean up partially created org to prevent orphans on retry.
      // Only runs if the org was created but setActiveOrganization hasn't
      // succeeded yet (createdOrgId is cleared after activation).
      if (createdOrgId) {
        try {
          await db.organization.delete({ where: { id: createdOrgId } });
        } catch (cleanupError) {
          console.error('Failed to clean up org after creation error:', cleanupError);
        }
      }

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
