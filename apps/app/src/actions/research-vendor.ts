'use server';

import { researchVendor } from '@/trigger/tasks/scrape/research';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';
import { authActionClientWithoutOrg } from './safe-action';

export const researchVendorAction = authActionClientWithoutOrg
  .inputSchema(
    z.object({
      website: z.string().url({ message: 'Invalid URL format' }),
    }),
  )
  .metadata({
    name: 'research-vendor',
  })
  .action(async ({ parsedInput: { website }, ctx }) => {
    try {
      // research-vendor writes to the shared GlobalVendors table rather than
      // per-org data, and this action runs without requiring an active
      // organization, so one isn't guaranteed here. Tag the run when one is
      // available so it can still be looked up through the org-scoped
      // status route.
      const organizationId = ctx.session.activeOrganizationId;

      const handle = await tasks.trigger<typeof researchVendor>(
        'research-vendor',
        { website },
        organizationId ? { tags: [organizationId] } : undefined,
      );

      return {
        success: true,
        handle,
      };
    } catch (error) {
      console.error('Error in researchVendorAction:', error);

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        },
      };
    }
  });
