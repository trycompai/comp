'use server';

import { authActionClient } from '@/actions/safe-action';
import { mapPolicyControlsTask } from '@/jobs/tasks/policies/map-policy-controls';
import { tasks } from '@trigger.dev/sdk';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const remapPolicyControlsSchema = z.object({
  policyId: z.string().min(1),
});

export const remapPolicyControlsAction = authActionClient
  .inputSchema(remapPolicyControlsSchema)
  .metadata({
    name: 'remap-policy-controls',
    track: {
      event: 'remap-policy-controls',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    await tasks.trigger<typeof mapPolicyControlsTask>('map-policy-controls', {
      organizationId: session.activeOrganizationId,
      policyId,
    });

    const headersList = await headers();
    let path = headersList.get('x-pathname') || headersList.get('referer') || '';
    path = path.replace(/\/[a-z]{2}\//, '/');
    revalidatePath(path);

    return { success: true };
  });
