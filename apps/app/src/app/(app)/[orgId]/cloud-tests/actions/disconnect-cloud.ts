'use server';

import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { authActionClient } from '../../../../../actions/safe-action';

const disconnectCloudSchema = z.object({
  cloudProvider: z.enum(['aws', 'gcp', 'azure']),
});

export const disconnectCloudAction = authActionClient
  .inputSchema(disconnectCloudSchema)
  .metadata({
    name: 'disconnect-cloud',
    track: {
      event: 'disconnect-cloud',
      channel: 'cloud-tests',
    },
  })
  .action(async ({ parsedInput: { cloudProvider }, ctx: { session } }) => {
    try {
      if (!session.activeOrganizationId) {
        return {
          success: false,
          error: 'No active organization found',
        };
      }

      // Find and delete the integration
      const integration = await db.integration.findFirst({
        where: {
          integrationId: cloudProvider,
          organizationId: session.activeOrganizationId,
        },
      });

      if (!integration) {
        return {
          success: false,
          error: 'Cloud provider not found',
        };
      }

      // Delete the integration (cascade will delete results)
      await db.integration.delete({
        where: { id: integration.id },
      });

      // Revalidate the path
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to disconnect cloud provider:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect cloud provider',
      };
    }
  });
