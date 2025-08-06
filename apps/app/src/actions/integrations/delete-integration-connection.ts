// delete-integration-connection.ts

'use server';

import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath } from 'next/cache';
import { authActionClient } from '../safe-action';
import { getDeleteIntegrationConnectionSchema } from '../schema';

export const deleteIntegrationConnectionAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getDeleteIntegrationConnectionSchema(t);
  })
  .metadata({
    name: 'delete-integration-connection',
    track: {
      event: 'delete-integration-connection',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { integrationName } = parsedInput;
    const { session } = ctx;
    const t = await getGT();

    if (!session.activeOrganizationId) {
      return {
        success: false,
        error: t('Unauthorized'),
      };
    }

    const integration = await db.integration.findFirst({
      where: {
        name: integrationName,
        organizationId: session.activeOrganizationId,
      },
    });

    if (!integration) {
      return {
        success: false,
        error: t('Integration not found'),
      };
    }

    await db.integration.delete({
      where: {
        id: integration.id,
      },
    });

    revalidatePath('/integrations');

    return {
      success: true,
    };
  });
