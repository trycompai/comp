'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateTrustOverviewSchema = z.object({
  orgId: z.string(),
  overviewTitle: z.string().max(200).nullable(),
  overviewContent: z.string().max(10000).nullable(),
  showOverview: z.boolean(),
});

export const updateTrustOverviewAction = authActionClient
  .metadata({
    name: 'update-trust-overview',
    track: {
      event: 'update-trust-overview',
      channel: 'server',
    },
  })
  .inputSchema(updateTrustOverviewSchema)
  .action(async ({ ctx, parsedInput }) => {
    await db.trust.update({
      where: { organizationId: parsedInput.orgId },
      data: {
        overviewTitle: parsedInput.overviewTitle,
        overviewContent: parsedInput.overviewContent,
        showOverview: parsedInput.showOverview,
      },
    });

    revalidatePath(`/${parsedInput.orgId}/trust/portal-settings`);

    return { success: true };
  });
