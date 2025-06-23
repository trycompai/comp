'use server';

import { authWithOrgAccessClient } from '@/actions/safe-action';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const chooseSelfServeSchema = z.object({
  organizationId: z.string(),
});

export const chooseSelfServeAction = authWithOrgAccessClient
  .inputSchema(chooseSelfServeSchema)
  .metadata({
    name: 'choose-self-serve',
    track: {
      event: 'choose-self-serve',
      description: 'User chose the self-serve (free) plan',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = parsedInput;
    const { member } = ctx;

    // Update the organization to mark that they chose self-serve
    await db.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        subscriptionType: 'SELF_SERVE',
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
  });
