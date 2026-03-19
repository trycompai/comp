import { logger, metadata, queue, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { processPolicyUpdate } from './update-policy-helpers';

const updatePolicyQueue = queue({ name: 'update-policy', concurrencyLimit: 50 });

export const updatePolicy = schemaTask({
  id: 'update-policy',
  maxDuration: 600,
  queue: updatePolicyQueue,
  retry: {
    maxAttempts: 5,
  },
  schema: z.object({
    organizationId: z.string(),
    policyId: z.string(),
    contextHub: z.string(),
    frameworks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        version: z.string(),
        description: z.string(),
        visible: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
    ),
    memberId: z.string().optional(),
  }),
  run: async (params) => {
    try {
      logger.info(`Starting policy update for policy ${params.policyId}`);

      if (metadata.parent) {
        metadata.parent.set(`policy_${params.policyId}_status`, 'processing');
      }

      const result = await processPolicyUpdate(params);

      if (metadata.parent) {
        metadata.parent.set(`policy_${params.policyId}_status`, 'completed');
        metadata.parent.increment('policiesCompleted', 1);
        metadata.parent.increment('policiesRemaining', -1);
      }

      logger.info(`Successfully updated policy ${params.policyId}`);
      return result;
    } catch (error) {
      logger.error(`Error updating policy ${params.policyId}:`, {
        error: error instanceof Error ? error.message : String(error),
        policyId: params.policyId,
        organizationId: params.organizationId,
      });
      throw error;
    }
  },
});
