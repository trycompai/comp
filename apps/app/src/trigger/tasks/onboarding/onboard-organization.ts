import { db } from '@db/server';
import { logger, metadata, queue, tags, task, tasks } from '@trigger.dev/sdk';
import axios from 'axios';
import { generateAuditorContentTask } from '../auditor/generate-auditor-content';
import { generateRiskMitigationsForOrg } from './generate-risk-mitigation';
import { generateVendorMitigationsForOrg } from './generate-vendor-mitigation';
import type { linkRisksAndVendorsToWork } from './link-risks-and-vendors-to-work';
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
    await tags.add([`org:${payload.organizationId}`]);

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

      const [frameworkInstances, owner] = await Promise.all([
        db.frameworkInstance.findMany({
          where: { organizationId: payload.organizationId },
        }),
        db.member.findFirst({
          where: {
            organizationId: payload.organizationId,
            role: { contains: 'owner' },
            deactivated: false,
          },
        }),
      ]);

      const frameworks = await db.frameworkEditorFramework.findMany({
        where: {
          id: {
            in: frameworkInstances
              .map((instance) => instance.frameworkId)
              .filter((id): id is string => Boolean(id)),
          },
        },
      });

      if (!owner) {
        logger.error(`Owner not found for organization ${payload.organizationId}`);
        throw new Error(`Owner not found for organization ${payload.organizationId}`);
      }

      await Promise.all([
        db.member.update({
          where: { id: owner.id },
          data: { role: 'owner,employee' },
        }),
        db.task.updateMany({
          where: { organizationId: payload.organizationId },
          data: { assigneeId: owner.id, frequency: 'quarterly' },
        }),
      ]);

      // Extract vendors + risks in parallel (both are independent LLM calls)
      metadata.set('currentStep', 'Researching Vendors and Risks...');

      const [vendors, risks] = await Promise.all([
        (async () => {
          const vendorData = await extractVendorsFromContext(questionsAndAnswers);
          if (vendorData.length > 0) {
            metadata.set('vendorsTotal', vendorData.length);
            metadata.set('vendorsCompleted', 0);
            metadata.set('vendorsRemaining', vendorData.length);
            metadata.set(
              'vendorsInfo',
              vendorData.map((v, index) => ({ id: `temp_${index}`, name: v.vendor_name })),
            );
            vendorData.forEach((_, index) => {
              metadata.set(`vendor_temp_${index}_status`, 'pending');
            });
          }
          const created = await createVendors(
            questionsAndAnswers,
            payload.organizationId,
            vendorData,
          );
          if (created.length > 0) {
            metadata.set(
              'vendorsInfo',
              created.map((v) => ({ id: v.id, name: v.name })),
            );
            created.forEach((vendor) => {
              metadata.set(`vendor_${vendor.id}_status`, 'assessing');
            });
          }
          metadata.set('vendors', true);
          return created;
        })(),
        (async () => {
          const created = await createRisks(
            questionsAndAnswers,
            payload.organizationId,
            organization.name,
          );
          if (created.length > 0) {
            created.forEach((risk) => {
              metadata.set(`risk_${risk.id}_status`, 'assessing');
            });
          }
          metadata.set('risk', true);
          return created;
        })(),
      ]);

      // Start policy fan-out first — policies depend on framework + Q&A
      // context only, NOT on linkage. Fire-and-forget so the main task can
      // proceed to linkage + mitigations while policies drain in parallel.
      // Per-policy progress is tracked via child metadata (policy_${id}_status).
      const policyCount = policyList.length;
      metadata.set('currentStep', `Tailoring Policies... (0/${policyCount})`);
      await updateOrganizationPolicies(payload.organizationId, questionsAndAnswers, frameworks);
      metadata.set('policies', true);

      // Auto-link risks + vendors to existing tasks BEFORE mitigation generation
      // runs, so the AI prompt for both risks AND vendors sees the linked
      // tasks/controls and produces grounded plans. Fan-out for both happens
      // after this gate. Fails-soft: a timeout/error degrades to today's
      // behavior. (ENG-221 + Cubic findings #7 / #26.)
      metadata.set('currentStep', 'Linking risks to tasks...');
      try {
        await tasks.triggerAndWait<typeof linkRisksAndVendorsToWork>(
          'link-risks-and-vendors-to-work',
          { organizationId: payload.organizationId },
        );
        metadata.set('linkage', true);
      } catch (err) {
        logger.warn('linkage step failed; continuing without grounded prompts', {
          organizationId: payload.organizationId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Fan-out vendor + risk mitigations now that linkage has populated the
      // grounding context for both kinds of entities. Done in parallel —
      // each fan-out task itself batchTriggers per-entity children.
      await Promise.all([
        tasks.trigger<typeof generateVendorMitigationsForOrg>(
          'generate-vendor-mitigations-for-org',
          { organizationId: payload.organizationId },
        ),
        tasks.trigger<typeof generateRiskMitigationsForOrg>(
          'generate-risk-mitigations-for-org',
          { organizationId: payload.organizationId },
        ),
      ]);

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
