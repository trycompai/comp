'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const revokeApiKeySchema = z.object({
  id: z.string().min(1),
});

export const revokeApiKeyAction = authActionClient
  .inputSchema(revokeApiKeySchema)
  .metadata({
    name: 'revokeApiKey',
    track: {
      event: 'revokeApiKey',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getGT();
    try {
      const { id } = parsedInput;

      const result = await db.apiKey.updateMany({
        where: {
          id,
          organizationId: ctx.session.activeOrganizationId!,
        },
        data: {
          isActive: false,
        },
      });

      if (result.count === 0) {
        return {
          success: false,
          error: t('API key not found or not authorized to revoke'),
        };
      }

      revalidatePath(`/${ctx.session.activeOrganizationId}/settings/api-keys`);

      return {
        success: true,
        message: t('API key revoked successfully'),
      };
    } catch (error) {
      console.error('Error revoking API key:', error);
      return {
        success: false,
        error: t('An error occurred while revoking the API key'),
      };
    }
  });
