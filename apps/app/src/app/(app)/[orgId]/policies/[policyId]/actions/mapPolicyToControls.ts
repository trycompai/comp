'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const mapPolicyToControlsSchema = z.object({
  policyId: z.string(),
  controlIds: z.array(z.string()),
});

export const mapPolicyToControls = authActionClient
  .inputSchema(mapPolicyToControlsSchema)
  .metadata({
    name: 'map-policy-to-controls',
    track: {
      event: 'map-policy-to-controls',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, controlIds } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      console.log(`Mapping controls ${controlIds} to policy ${policyId}`);

      // Update the policy to connect it to the specified controls
      const updatedPolicy = await db.policy.update({
        where: { id: policyId, organizationId: session.activeOrganizationId },
        data: {
          controls: {
            connect: controlIds.map((id) => ({ id })),
          },
        },
        include: {
          // Optional: include controls to verify or log
          controls: true,
        },
      });

      console.log('Policy updated with controls:', updatedPolicy.controls);
      console.log(`Controls mapped successfully to policy ${policyId}`);

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return {
        success: true,
        data: updatedPolicy.controls,
      };
    } catch (error) {
      console.error('Error mapping controls to policy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to map controls',
      };
    }
  });
