'use server';

import { authActionClient } from '@/actions/safe-action';
import { generateVendorMitigation } from '@/trigger/tasks/onboarding/generate-vendor-mitigation';
import {
  findCommentAuthor,
  type PolicyContext,
} from '@/trigger/tasks/onboarding/onboard-organization-helpers';
import { db } from '@db';
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

    await tasks.trigger<typeof generateVendorMitigation>('generate-vendor-mitigation', {
      organizationId,
      vendorId,
      authorId: author.id,
      policies,
    });

    return { success: true };
  });
