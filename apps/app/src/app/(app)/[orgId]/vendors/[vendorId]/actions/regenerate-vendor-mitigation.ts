'use server';

import { authActionClient } from '@/actions/safe-action';
import { generateVendorMitigation } from '@/jobs/tasks/onboarding/generate-vendor-mitigation';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';

export const regenerateVendorMitigationAction = authActionClient
  .inputSchema(
    z.object({
      vendorId: z.string().min(1),
    }),
  )
  .metadata({
    name: 'regenerate-vendor-mitigation',
    track: {
      event: 'regenerate-vendor-mitigation',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { vendorId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    await tasks.trigger<typeof generateVendorMitigation>('generate-vendor-mitigation', {
      organizationId: session.activeOrganizationId,
      vendorId,
    });

    return { success: true };
  });
