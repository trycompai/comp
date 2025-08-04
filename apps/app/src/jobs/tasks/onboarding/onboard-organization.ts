import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk/v3';
import {
  extractVendorsFromContext,
  getOrganizationContext,
  processPolicyUpdates,
  processRisks,
  processVendors,
  revalidateOrganizationPath,
} from './onboard-organization-helpers';

export const onboardOrganization = task({
  id: 'onboard-organization',
  cleanup: async ({ organizationId }: { organizationId: string }) => {
    await db.onboarding.update({
      where: { organizationId },
      data: { triggerJobId: null },
    });

    await revalidateOrganizationPath(organizationId);
  },
  run: async (payload: { organizationId: string }) => {
    logger.info(`Start onboarding organization ${payload.organizationId}`);

    try {
      // Get organization context and data
      const { organization, questionsAndAnswers, policies } = await getOrganizationContext(
        payload.organizationId,
      );

      // Extract and process vendors
      const vendorData = await extractVendorsFromContext(questionsAndAnswers);
      await processVendors(vendorData, payload.organizationId, policies);

      // Extract and process risks
      await processRisks(questionsAndAnswers, payload.organizationId, organization.name);

      // Update policies with context
      await processPolicyUpdates(payload.organizationId, questionsAndAnswers);

      // Mark onboarding as completed
      await db.onboarding.update({
        where: { organizationId: payload.organizationId },
        data: { triggerJobCompleted: true },
      });

      logger.info(`Created ${vendorData.length} vendors`);
      logger.info(`Onboarding completed for organization ${payload.organizationId}`);
    } catch (error) {
      logger.error(`Error during onboarding for organization ${payload.organizationId}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
