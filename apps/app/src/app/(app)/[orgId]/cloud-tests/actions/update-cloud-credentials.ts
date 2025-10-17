'use server';

import { encrypt } from '@/lib/encryption';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { authActionClient } from '../../../../../actions/safe-action';

const updateCloudCredentialsSchema = z.object({
  cloudProvider: z.enum(['aws', 'gcp', 'azure']),
  credentials: z.record(z.string(), z.string()),
});

export const updateCloudCredentialsAction = authActionClient
  .inputSchema(updateCloudCredentialsSchema)
  .metadata({
    name: 'update-cloud-credentials',
    track: {
      event: 'update-cloud-credentials',
      channel: 'cloud-tests',
    },
  })
  .action(async ({ parsedInput: { cloudProvider, credentials }, ctx: { session } }) => {
    try {
      if (!session.activeOrganizationId) {
        return {
          success: false,
          error: 'No active organization found',
        };
      }

      // Find the integration
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

      // Encrypt all credential fields
      const encryptedCredentials: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (value) {
          encryptedCredentials[key] = await encrypt(value);
        }
      }

      // Update the integration
      await db.integration.update({
        where: { id: integration.id },
        data: {
          userSettings: encryptedCredentials as any,
        },
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
      console.error('Failed to update cloud credentials:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update cloud credentials',
      };
    }
  });
