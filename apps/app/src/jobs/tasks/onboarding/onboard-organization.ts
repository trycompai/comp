import { db } from '@db';
import { queue } from '@trigger.dev/sdk';
import { logger, task } from '@trigger.dev/sdk/v3';
import axios from 'axios';
import {
  createRisks,
  createVendorRiskMitigation,
  createVendors,
  getOrganizationContext,
  updateOrganizationPolicies,
} from './onboard-organization-helpers';
import { updatePolicies } from './update-policies';

// v4 queues must be declared in advance
const onboardOrgQueue = queue({ name: 'onboard-organization', concurrencyLimit: 10 });

export const onboardOrganization = task({
  id: 'onboard-organization',
  queue: onboardOrgQueue,
  run: async (payload: { organizationId: string }) => {
    logger.info(`Start onboarding organization ${payload.organizationId}`);

    try {
      // Get organization context
      const { organization, questionsAndAnswers, policies } = await getOrganizationContext(
        payload.organizationId,
      );

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

      // Create vendors
      const vendors = await createVendors(questionsAndAnswers, payload.organizationId);

      // Create risk mitigation for vendors
      await createVendorRiskMitigation(vendors, policies, payload.organizationId);

      // Create risks
      await createRisks(questionsAndAnswers, payload.organizationId, organization.name);

      // Update policies
      await updateOrganizationPolicies(payload.organizationId, questionsAndAnswers, frameworks);

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

    // Re-fetch policies with full data for policy updates
    const fullPolicies = await db.policy.findMany({
      where: {
        organizationId: payload.organizationId,
      },
    });

    if (fullPolicies.length > 0) {
      // v4: queues are predefined on the task; trigger without on-demand queue options
      await updatePolicies.batchTriggerAndWait(
        fullPolicies.map((policy) => ({
          payload: {
            organizationId: payload.organizationId,
            policyId: policy.id,
            contextHub: contextHub.map((c) => `${c.question}\n${c.answer}`).join('\n'),
          },
          concurrencyKey: payload.organizationId,
        })),
      );
    }

    await db.onboarding.update({
      where: {
        organizationId: payload.organizationId,
      },
      data: { triggerJobCompleted: true },
    });

    logger.info(`Created ${extractRisks.object.risks.length} risks`);
    logger.info(`Created ${extractVendors.object.vendors.length} vendors`);

    const organizationId = payload.organizationId;
    await db.onboarding.update({
      where: {
        organizationId,
      },
      data: { triggerJobId: null },
    });

    try {
      logger.info(`Revalidating path ${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/${organizationId}`);
      const revalidateResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/revalidate/path`,
        {
          path: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/${organizationId}`,
          secret: process.env.REVALIDATION_SECRET,
          type: 'layout',
        },
      );

      if (!revalidateResponse.data?.revalidated) {
        logger.error(`Failed to revalidate path: ${revalidateResponse.statusText}`);
        logger.error(revalidateResponse.data);
      } else {
        logger.info('Revalidated path successfully');
      }
    } catch (err) {
      logger.error('Error revalidating path', { err });
    }
  },
});
