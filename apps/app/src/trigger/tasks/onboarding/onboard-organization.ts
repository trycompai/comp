import { db } from '@db';
import { logger, metadata, queue, task, tasks } from '@trigger.dev/sdk';
import axios from 'axios';
import { generateAuditorContentTask } from '../auditor/generate-auditor-content';
import { generateRiskMitigationsForOrg } from './generate-risk-mitigation';
import { generateVendorMitigationsForOrg } from './generate-vendor-mitigation';
import {
  createRisks,
  createVendors,
  extractVendorsFromContext,
  getOrganizationContext,
  updateOrganizationPolicies,
} from './onboard-organization-helpers';

// v4 queues must be declared in advance
const onboardOrgQueue = queue({ name: 'onboard-organization', concurrencyLimit: 50 });

export const onboardOrganization = task({
  id: 'onboard-organization',
  queue: onboardOrgQueue,
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { organizationId: string }) => {
    logger.info(`Start onboarding organization ${payload.organizationId}`);

    // Initialize metadata for real-time tracking
    metadata.set('currentStep', 'Researching Vendors...');
    metadata.set('vendors', false);
    metadata.set('risk', false);
    metadata.set('policies', false);

    try {
      // Get organization context
      const {
        organization,
        questionsAndAnswers,
        policies,
      }: Awaited<ReturnType<typeof getOrganizationContext>> = await getOrganizationContext(
        payload.organizationId,
      );
      const policyList = policies ?? [];
      // Initialize policy metadata immediately so UI can reflect pending status
      if (policyList.length > 0) {
        metadata.set('policiesTotal', policyList.length);
        metadata.set('policiesCompleted', 0);
        metadata.set('policiesRemaining', policyList.length);
        metadata.set(
          'policiesInfo',
          policyList.map((policy) => ({ id: policy.id, name: policy.name })),
        );
        policyList.forEach((policy) => {
          metadata.set(`policy_${policy.id}_status`, 'queued');
        });
      } else {
        metadata.set('policiesTotal', 0);
        metadata.set('policiesCompleted', 0);
        metadata.set('policiesRemaining', 0);
        metadata.set('policiesInfo', []);
      }

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
          deactivated: false,
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

      // Extract vendors first so we can show them immediately
      const vendorData = await extractVendorsFromContext(questionsAndAnswers);

      // Track vendors immediately as "pending" before creation
      if (vendorData.length > 0) {
        metadata.set('vendorsTotal', vendorData.length);
        metadata.set('vendorsCompleted', 0);
        metadata.set('vendorsRemaining', vendorData.length);
        // Use temporary IDs based on index until we have real IDs
        metadata.set(
          'vendorsInfo',
          vendorData.map((v, index) => ({ id: `temp_${index}`, name: v.vendor_name })),
        );
        // Mark all as pending initially
        vendorData.forEach((_, index) => {
          metadata.set(`vendor_temp_${index}_status`, 'pending');
        });
      }

      // Create vendors (pass extracted data to avoid re-extraction)
      // Tracking is handled inside createVendors -> createVendorsFromData
      const vendors = await createVendors(questionsAndAnswers, payload.organizationId, vendorData);

      // Update tracking with real vendor IDs (tracking during creation uses temp IDs)
      if (vendors.length > 0) {
        metadata.set(
          'vendorsInfo',
          vendors.map((v) => ({ id: v.id, name: v.name })),
        );
        // Mark all created vendors as "assessing" since they need mitigation
        vendors.forEach((vendor) => {
          metadata.set(`vendor_${vendor.id}_status`, 'assessing');
        });
      }

      // Mark vendors step as complete in metadata (real-time)
      metadata.set('vendors', true);
      metadata.set('currentStep', 'Creating Risks...');

      // Fan-out vendor mitigations as separate jobs
      await tasks.trigger<typeof generateVendorMitigationsForOrg>(
        'generate-vendor-mitigations-for-org',
        {
          organizationId: payload.organizationId,
        },
      );

      // Create risks (tracking is handled inside createRisks)
      const risks = await createRisks(
        questionsAndAnswers,
        payload.organizationId,
        organization.name,
      );

      // Mark all created risks as "assessing" since they need mitigation
      if (risks.length > 0) {
        risks.forEach((risk) => {
          metadata.set(`risk_${risk.id}_status`, 'assessing');
        });
      }

      // Mark risks step as complete in metadata (real-time)
      metadata.set('risk', true);

      // Get policy count for the step message
      const policyCount = policyList.length;
      metadata.set('currentStep', `Tailoring Policies... (0/${policyCount})`);

      // Fan-out risk mitigations as separate jobs
      await tasks.trigger<typeof generateRiskMitigationsForOrg>(
        'generate-risk-mitigations-for-org',
        {
          organizationId: payload.organizationId,
        },
      );

      // Update policies with progress tracking
      await updateOrganizationPolicies(payload.organizationId, questionsAndAnswers, frameworks);

      // Mark policies step as complete in metadata (real-time)
      metadata.set('policies', true);
      metadata.set('currentStep', 'Finalizing...');

      // Mark onboarding as completed in metadata
      metadata.set('completed', true);

      // Mark onboarding as completed in database
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

    // Generate auditor content in the background
    await tasks.trigger<typeof generateAuditorContentTask>('generate-auditor-content', {
      organizationId,
    });
    logger.info(`Triggered auditor content generation for organization ${organizationId}`);
  },
});
