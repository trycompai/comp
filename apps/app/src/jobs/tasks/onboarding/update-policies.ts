import { logger, schemaTask } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { processPolicyUpdate } from './update-policies-helpers';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

export const updatePolicies = schemaTask({
  id: 'update-policies',
  schema: z.object({
    organizationId: z.string(),
    policyId: z.string(),
    contextHub: z.string(),
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
