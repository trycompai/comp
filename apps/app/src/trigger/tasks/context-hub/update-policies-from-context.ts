import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { logger, metadata, queue, schemaTask, tasks } from '@trigger.dev/sdk/v3';
import { generateObject } from 'ai';
import { z } from 'zod';

import { patchPolicyFromContext } from './patch-policy-from-context';

const updatePoliciesFromContextQueue = queue({
  name: 'update-policies-from-context',
  concurrencyLimit: 5,
});

export const updatePoliciesFromContext = schemaTask({
  id: 'update-policies-from-context',
  maxDuration: 600,
  queue: updatePoliciesFromContextQueue,
  schema: z.object({
    organizationId: z.string(),
    contextId: z.string(),
    contextQuestion: z.string(),
    contextAnswer: z.string(),
  }),
  run: async (payload) => {
    const { organizationId, contextQuestion, contextAnswer } = payload;

    logger.info('Starting policy update from context', { organizationId });

    metadata.set('phase', 'analyzing');
    metadata.set('totalPolicies', 0);
    metadata.set('analyzedCount', 0);
    metadata.set('affectedCount', 0);
    metadata.set('policiesTotal', 0);
    metadata.set('policiesCompleted', 0);
    metadata.set('affectedPoliciesInfo', []);

    const policies = await db.policy.findMany({
      where: { organizationId },
      include: {
        policyTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (policies.length === 0) {
      logger.info('No policies found, skipping', { organizationId });
      metadata.set('phase', 'completed');
      return { updatedCount: 0, analyzedCount: 0, skipped: true };
    }

    metadata.set('totalPolicies', policies.length);

    const affectedPolicies: typeof policies = [];
    const affectedPoliciesInfo: Array<{ id: string; name: string }> = [];
    const batchSize = 10;

    for (let i = 0; i < policies.length; i += batchSize) {
      const batch = policies.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (policy) => {
          const policyName = policy.policyTemplate?.name ?? policy.name;
          const isAffected = await analyzePolicyRelevance(
            contextQuestion,
            contextAnswer,
            policyName,
            policy.policyTemplate?.description ?? '',
          );
          return { policy, isAffected };
        }),
      );

      for (const { policy, isAffected } of results) {
        if (isAffected) {
          affectedPolicies.push(policy);
          const policyName = policy.policyTemplate?.name ?? policy.name;
          affectedPoliciesInfo.push({ id: policy.id, name: policyName });
        }
      }

      metadata.set('analyzedCount', i + batch.length);
      metadata.set('affectedCount', affectedPolicies.length);
      metadata.set('affectedPoliciesInfo', affectedPoliciesInfo);
    }

    logger.info(`Found ${affectedPolicies.length} affected policies out of ${policies.length}`, {
      affectedPolicyIds: affectedPolicies.map((p) => p.id),
    });

    if (affectedPolicies.length === 0) {
      metadata.set('phase', 'completed');
      return { updatedCount: 0, analyzedCount: policies.length };
    }

    metadata.set('phase', 'updating');
    metadata.set('policiesTotal', affectedPolicies.length);
    metadata.set('policiesCompleted', 0);
    metadata.set('policyDiffs', []);

    for (const policy of affectedPolicies) {
      metadata.set(`policy_${policy.id}_status`, 'pending');
    }

    await tasks.batchTrigger<typeof patchPolicyFromContext>(
      'patch-policy-from-context',
      affectedPolicies.map((policy) => ({
        payload: {
          organizationId,
          policyId: policy.id,
          contextQuestion,
          contextAnswer,
        },
      })),
    );

    metadata.set('phase', 'completed');

    return {
      updatedCount: affectedPolicies.length,
      analyzedCount: policies.length,
    };
  },
});

async function analyzePolicyRelevance(
  contextQuestion: string,
  contextAnswer: string,
  policyName: string,
  policyDescription: string,
): Promise<boolean> {
  const { object } = await generateObject({
    model: openai('gpt-4.1'),
    schema: z.object({
      affected: z.boolean(),
      reason: z.string(),
    }),
    prompt: `Analyze if this context change affects the given policy.

Context Change:
Question: ${contextQuestion}
Answer: ${contextAnswer}

Policy:
Name: ${policyName}
Description: ${policyDescription}

Does this context change likely affect this policy's content? Consider:
- Does the policy cover topics related to the context question?
- Would the answer impact statements or commitments in the policy?
- Is there semantic overlap between the context subject matter and policy scope?

Be conservative - only mark as affected if there's a clear connection.
Respond with whether the policy is affected and a brief reason.`,
  });

  return object.affected;
}
