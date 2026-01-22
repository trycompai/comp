import { db } from '@db';
import { logger, queue, task } from '@trigger.dev/sdk';
import { getOrganizationContext, triggerPolicyUpdates } from './onboard-organization-helpers';

// v4 queues must be declared in advance
const generateFullPoliciesQueue = queue({
  name: 'generate-full-policies',
  concurrencyLimit: 50,
});

export const generateFullPolicies = task({
  id: 'generate-full-policies',
  queue: generateFullPoliciesQueue,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { organizationId: string }) => {
    logger.info(`Starting full policy generation for organization ${payload.organizationId}`);

    try {
      // Get organization context
      const { questionsAndAnswers } = await getOrganizationContext(payload.organizationId);

      // Get frameworks
      const frameworkInstances = await db.frameworkInstance.findMany({
        where: {
          organizationId: payload.organizationId,
        },
      });

      const frameworks = await db.frameworkEditorFramework.findMany({
        where: {
          id: {
            in: frameworkInstances.map((instance) => instance.frameworkId),
          },
        },
      });

      // Trigger policy updates for all policies
      await triggerPolicyUpdates(payload.organizationId, questionsAndAnswers, frameworks);

      logger.info(
        `Successfully triggered policy updates for organization ${payload.organizationId}`,
      );
    } catch (error) {
      logger.error(`Error during policy generation for organization ${payload.organizationId}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
