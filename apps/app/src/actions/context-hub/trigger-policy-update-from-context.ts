'use server';

import { updatePoliciesFromContext } from '@/trigger/tasks/context-hub/update-policies-from-context';
import { db } from '@db';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

export const triggerPolicyUpdateFromContextAction = authActionClient
  .inputSchema(
    z.object({
      contextId: z.string().min(1, 'Context ID is required'),
    }),
  )
  .metadata({
    name: 'trigger-policy-update-from-context',
  })
  .action(async ({ parsedInput: { contextId }, ctx: { session } }) => {
    const organizationId = session.activeOrganizationId;
    if (!organizationId) throw new Error('No active organization');

    const context = await db.context.findUnique({
      where: { id: contextId, organizationId },
    });

    if (!context) throw new Error('Context not found');

    const handle = await tasks.trigger<typeof updatePoliciesFromContext>(
      'update-policies-from-context',
      {
        organizationId,
        contextId,
        contextQuestion: context.question,
        contextAnswer: context.answer,
      },
    );

    return {
      success: true,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    };
  });
