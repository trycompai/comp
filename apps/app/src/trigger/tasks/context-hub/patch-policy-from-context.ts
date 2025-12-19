import { logger, metadata, queue, schemaTask } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

import { updatePolicyFromContext } from './update-policy-from-context-helpers';

const patchPolicyFromContextQueue = queue({
  name: 'patch-policy-from-context',
  concurrencyLimit: 10,
});

export const patchPolicyFromContext = schemaTask({
  id: 'patch-policy-from-context',
  maxDuration: 300,
  queue: patchPolicyFromContextQueue,
  retry: {
    maxAttempts: 3,
  },
  schema: z.object({
    organizationId: z.string(),
    policyId: z.string(),
    contextQuestion: z.string(),
    contextAnswer: z.string(),
  }),
  run: async (params) => {
    const { organizationId, policyId, contextQuestion, contextAnswer } = params;

    logger.info(`Patching policy ${policyId} based on context change`);

    if (metadata.parent) {
      metadata.parent.set(`policy_${policyId}_status`, 'processing');
    }

    try {
      const result = await updatePolicyFromContext({
        organizationId,
        policyId,
        contextQuestion,
        contextAnswer,
      });

      if (metadata.parent) {
        metadata.parent.set(`policy_${policyId}_status`, 'completed');
        metadata.parent.increment('policiesCompleted', 1);

        if (result) {
          metadata.parent.append('policyDiffs', JSON.parse(JSON.stringify(result.diff)));
        }
      }

      if (!result) {
        logger.info(`No changes needed for policy ${policyId}`);
        return { policyId, updated: false, sectionsModified: [] };
      }

      logger.info(`Successfully patched policy ${policyId}`, {
        sectionsModified: result.diff.sectionsModified,
      });

      return {
        policyId,
        updated: true,
        sectionsModified: result.diff.sectionsModified,
        diff: result.diff,
      };
    } catch (error) {
      logger.error(`Error patching policy ${policyId}:`, {
        error: error instanceof Error ? error.message : String(error),
      });

      if (metadata.parent) {
        metadata.parent.set(`policy_${policyId}_status`, 'completed');
        metadata.parent.increment('policiesCompleted', 1);
      }

      throw error;
    }
  },
});
