import { db } from '@db';
import { logger, task } from '@trigger.dev/sdk/v3';
import {
  createRisks,
  createVendorRiskMitigation,
  createVendors,
  getOrganizationContext,
  revalidateOrganizationPath,
  updateOrganizationPolicies,
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
      // Get organization context
      const { organization, questionsAndAnswers, policies } = await getOrganizationContext(
        payload.organizationId,
      );

      // Create vendors
      const vendors = await createVendors(questionsAndAnswers, payload.organizationId);

      // Create risk mitigation for vendors
      await createVendorRiskMitigation(vendors, policies, payload.organizationId);

      // Create risks
      await createRisks(questionsAndAnswers, payload.organizationId, organization.name);

      // Update policies
      await updateOrganizationPolicies(payload.organizationId, questionsAndAnswers);

      // Mark onboarding as completed
      await db.onboarding.update({
        where: { organizationId: payload.organizationId },
        data: { triggerJobCompleted: true },
      });

      logger.info(`Created ${vendors.length} vendors`);
      logger.info(`Onboarding completed for organization ${payload.organizationId}`);
    } catch (error) {
      logger.error(`Error during onboarding for organization ${payload.organizationId}:`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});
