'use server';

import { authActionClient } from '@/actions/safe-action';
import { updatePolicy } from '@/trigger/tasks/onboarding/update-policy';
import { db } from '@db';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';

export const regeneratePolicyAction = authActionClient
  .inputSchema(
    z.object({
      policyId: z.string().min(1),
    }),
  )
  .metadata({
    name: 'regenerate-policy',
    track: {
      event: 'regenerate-policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
    const { session } = ctx;

    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    // Load frameworks associated to this organization via instances
    const instances = await db.frameworkInstance.findMany({
      where: { organizationId: session.activeOrganizationId },
      include: {
        framework: true,
      },
    });

    const uniqueFrameworks = Array.from(
      new Map(instances.map((fi) => [fi.framework.id, fi.framework])).values(),
    ).map((f) => ({
      id: f.id,
      name: f.name,
      version: f.version,
      description: f.description,
      visible: f.visible,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    // Build contextHub string from context table Q&A
    const contextEntries = await db.context.findMany({
      where: { organizationId: session.activeOrganizationId },
      orderBy: { createdAt: 'asc' },
    });
    const contextHub = contextEntries.map((c) => `${c.question}\n${c.answer}`).join('\n');

    await tasks.trigger<typeof updatePolicy>('update-policy', {
      organizationId: session.activeOrganizationId,
      policyId,
      contextHub,
      frameworks: uniqueFrameworks,
    });

    // Revalidation handled by safe-action middleware using x-pathname header
    return { success: true };
  });
