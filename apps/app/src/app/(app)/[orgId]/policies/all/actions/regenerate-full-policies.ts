'use server';

import { authActionClient } from '@/actions/safe-action';
import { generateFullPolicies } from '@/trigger/tasks/onboarding/generate-full-policies';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';

export const regenerateFullPoliciesAction = authActionClient
  .inputSchema(z.object({}))
  .metadata({
    name: 'regenerate-full-policies',
    track: {
      event: 'regenerate-full-policies',
      channel: 'server',
    },
  })
  .action(async ({ ctx }) => {
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    await tasks.trigger<typeof generateFullPolicies>('generate-full-policies', {
      organizationId: session.activeOrganizationId,
    });

    // Revalidation handled by safe-action middleware using x-pathname header
    return { success: true };
  });
