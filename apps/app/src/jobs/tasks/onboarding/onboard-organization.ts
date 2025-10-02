import { db } from '@db';
import { env } from '@/env.mjs';
import { logger, queue, task, tasks } from '@trigger.dev/sdk';
import axios from 'axios';
import { generateRiskMitigationsForOrg } from './generate-risk-mitigation';
import { generateVendorMitigationsForOrg } from './generate-vendor-mitigation';
import {
  createRisks,
  createVendors,
  getOrganizationContext,
  updateOrganizationPolicies,
} from './onboard-organization-helpers';

// v4 queues must be declared in advance
const onboardOrgQueue = queue({
  name: 'onboard-organization',
  concurrencyLimit: env.TRIGGER_QUEUE_CONCURRENCY ?? 10,
});

export const onboardOrganization = task({
  id: 'onboard-organization',
  queue: onboardOrgQueue,
  retry: {
    maxAttempts: 3,
  },
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

      // Get owner
      const owner = await db.member.findFirst({
        where: {
          organizationId: payload.organizationId,
          role: {
            contains: 'owner',
          },
        },
      });

      if (!owner) {
        logger.error(`Owner not found for organization ${payload.organizationId}`);
        throw new Error(`Owner not found for organization ${payload.organizationId}`);
      }

      // Update owner to also be an employee
      await db.member.update({
        where: {
          id: owner.id,
        },
        data: {
          role: 'owner,employee',
        },
      });

      // Assign owner to all tasks
      await db.task.updateMany({
        where: {
          organizationId: payload.organizationId,
        },
        data: {
          assigneeId: owner.id,
        },
      });

      // Update tasks to be quarterly
      await db.task.updateMany({
        where: {
          organizationId: payload.organizationId,
        },
        data: {
          frequency: 'quarterly',
        },
      });

      // Create vendors
      const vendors = await createVendors(questionsAndAnswers, payload.organizationId);

      // Fan-out vendor mitigations as separate jobs
      await tasks.trigger<typeof generateVendorMitigationsForOrg>(
        'generate-vendor-mitigations-for-org',
        {
          organizationId: payload.organizationId,
        },
      );

      // Create risks
      await createRisks(questionsAndAnswers, payload.organizationId, organization.name);

      // Fan-out risk mitigations as separate jobs
      await tasks.trigger<typeof generateRiskMitigationsForOrg>(
        'generate-risk-mitigations-for-org',
        {
          organizationId: payload.organizationId,
        },
      );

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

    const organizationId = payload.organizationId;
    await db.onboarding.update({
      where: {
        organizationId,
      },
      data: { triggerJobId: null, triggerJobCompleted: true },
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
