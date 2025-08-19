'use server';

import { authActionClient } from '@/actions/safe-action';
import { generateRiskMitigation } from '@/jobs/tasks/onboarding/generate-risk-mitigation';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';

export const regenerateRiskMitigationAction = authActionClient
  .inputSchema(
    z.object({
      riskId: z.string().min(1),
    }),
  )
  .metadata({
    name: 'regenerate-risk-mitigation',
    track: {
      event: 'regenerate-risk-mitigation',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { riskId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    await tasks.trigger<typeof generateRiskMitigation>('generate-risk-mitigation', {
      organizationId: session.activeOrganizationId,
      riskId,
    });

    return { success: true };
  });
