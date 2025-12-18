import { openai } from '@ai-sdk/openai';
import { db } from '@db';
import { logger, queue, schemaTask, tasks } from '@trigger.dev/sdk/v3';
import { generateObject } from 'ai';
import { z } from 'zod';
import { updatePolicy } from '../onboarding/update-policy';

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

    console.log('[update-policies-from-context] Starting', { organizationId, contextQuestion });

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
      console.log('[update-policies-from-context] No policies found, skipping', { organizationId });
      return { updatedCount: 0, analyzedCount: 0, skipped: true };
    }

    console.log(`[update-policies-from-context] Found ${policies.length} policies to analyze`);

    const contexts = await db.context.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    const contextHub = contexts.map((c) => `${c.question}\n${c.answer}`).join('\n');

    const affectedPolicies: typeof policies = [];
    const batchSize = 10;

    for (let i = 0; i < policies.length; i += batchSize) {
      const batch = policies.slice(i, i + batchSize);
      console.log(
        `[update-policies-from-context] Analyzing batch ${i / batchSize + 1}, policies: ${batch.map((p) => p.name).join(', ')}`,
      );

      const results = await Promise.all(
        batch.map(async (policy) => {
          const policyName = policy.policyTemplate?.name ?? policy.name;
          console.log(`[update-policies-from-context] Analyzing policy: ${policyName}`);
          const isAffected = await analyzePolicyRelevance(
            contextQuestion,
            contextAnswer,
            policyName,
            policy.policyTemplate?.description ?? '',
          );
          console.log(
            `[update-policies-from-context] Policy "${policyName}" affected: ${isAffected}`,
          );
          return { policy, isAffected };
        }),
      );

      for (const { policy, isAffected } of results) {
        if (isAffected) {
          affectedPolicies.push(policy);
        }
      }
    }

    logger.info(`Found ${affectedPolicies.length} affected policies out of ${policies.length}`, {
      affectedPolicyIds: affectedPolicies.map((p) => p.id),
      affectedPolicyNames: affectedPolicies.map((p) => p.name),
    });

    if (affectedPolicies.length === 0) {
      logger.info('No policies affected by context change', {
        organizationId,
        analyzedCount: policies.length,
      });
      return { updatedCount: 0, analyzedCount: policies.length };
    }

    const instances = await db.frameworkInstance.findMany({
      where: { organizationId },
      include: { framework: true },
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

    await tasks.batchTrigger<typeof updatePolicy>(
      'update-policy',
      affectedPolicies.map((policy) => ({
        payload: {
          organizationId,
          policyId: policy.id,
          contextHub,
          frameworks: uniqueFrameworks,
        },
      })),
    );

    logger.info(`Triggered updates for ${affectedPolicies.length} policies`);

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
  try {
    console.log(`[analyzePolicyRelevance] Calling AI for policy: ${policyName}`);
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

    logger.info(`Policy "${policyName}" relevance: ${object.affected} - ${object.reason}`);
    return object.affected;
  } catch (error) {
    console.error(
      `[analyzePolicyRelevance] FAILED for "${policyName}":`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
