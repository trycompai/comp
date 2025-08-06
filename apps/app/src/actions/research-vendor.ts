'use server';

import { researchVendor } from '@/jobs/tasks/scrape/research';
import { tasks } from '@trigger.dev/sdk/v3';
import { getGT } from 'gt-next/server';
import { z } from 'zod';
import { authActionClient } from './safe-action';

export const researchVendorAction = authActionClient
  .inputSchema(
    z.object({
      website: z.string().url({ message: 'Invalid URL format' }),
    }),
  )
  .metadata({
    name: 'research-vendor',
  })
  .action(async ({ parsedInput: { website }, ctx: { session } }) => {
    try {
      const { activeOrganizationId } = session;

      if (!activeOrganizationId) {
        const t = await getGT();
        return {
          success: false,
          error: t('Not authorized'),
        };
      }

      const handle = await tasks.trigger<typeof researchVendor>('research-vendor', {
        website,
      });

      return {
        success: true,
        handle,
      };
    } catch (error) {
      console.error('Error in researchVendorAction:', error);

      const t = await getGT();
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : t('An unexpected error occurred.'),
        },
      };
    }
  });
