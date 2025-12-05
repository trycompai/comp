'use server';

import { authActionClient } from '@/actions/safe-action';
import { generateRiskMitigation } from '@/trigger/tasks/onboarding/generate-risk-mitigation';
import {
  findCommentAuthor,
  type PolicyContext,
} from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { db } from '@db';
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

    const organizationId = session.activeOrganizationId;

    const [author, policyRows] = await Promise.all([
      findCommentAuthor(organizationId),
      db.policy.findMany({
        where: { organizationId },
        select: { name: true, description: true },
      }),
    ]);

    if (!author) {
      throw new Error('No eligible author found to regenerate the mitigation');
    }

    const policies: PolicyContext[] = policyRows.map((policy) => ({
      name: policy.name,
      description: policy.description,
    }));

    await tasks.trigger<typeof generateRiskMitigation>('generate-risk-mitigation', {
      organizationId,
      riskId,
      authorId: author.id,
      policies,
    });

    return { success: true };
  });
