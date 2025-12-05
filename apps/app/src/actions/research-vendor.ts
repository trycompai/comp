'use server';

import { researchVendor } from '@/trigger/tasks/scrape/research';
import { tasks } from '@trigger.dev/sdk';
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
        return {
          success: false,
          error: 'Not authorized',
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

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        },
      };
    }
  });
