import { logger, queue, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { processPolicyUpdate } from './update-policies-helpers';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// v4: define queue ahead of time
export const updatePoliciesQueue = queue({ name: 'update-policies', concurrencyLimit: 5 });

export const updatePolicies = schemaTask({
  id: 'update-policies',
  maxDuration: 600, // 10 minutes.
  queue: updatePoliciesQueue,
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
  }),
  run: async (params) => {
    try {
      logger.info(`Starting policy update for policy ${params.policyId}`);

      const result = await processPolicyUpdate(params);

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
