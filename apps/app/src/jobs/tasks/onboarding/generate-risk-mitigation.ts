import { RiskStatus, db } from '@db';
import { logger, metadata, queue, task } from '@trigger.dev/sdk';
import axios from 'axios';
import {
  createRiskMitigationComment,
  findCommentAuthor,
  type PolicyContext,
} from './onboard-organization-helpers';

// Queues
const riskMitigationQueue = queue({ name: 'risk-mitigations', concurrencyLimit: 50 });
const riskMitigationFanoutQueue = queue({ name: 'risk-mitigations-fanout', concurrencyLimit: 50 });

export const generateRiskMitigation = task({
  id: 'generate-risk-mitigation',
  queue: riskMitigationQueue,
  retry: {
    maxAttempts: 5,
  },
  run: async (payload: {
    organizationId: string;
    riskId: string;
    authorId: string;
    policies: PolicyContext[];
  }) => {
    const { organizationId, riskId, authorId, policies } = payload;
    logger.info(`Generating risk mitigation for risk ${riskId} in org ${organizationId}`);

    const risk = await db.risk.findFirst({ where: { id: riskId, organizationId } });

    if (!risk) {
      logger.warn(`Risk ${riskId} not found in org ${organizationId}`);
      return;
    }

    // Mark as processing before generating mitigation
    // Update root onboarding task metadata if available (when triggered from onboarding)
    // Try root first (onboarding task), then parent (fanout task), then own metadata
    const metadataHandle = metadata.root ?? metadata.parent ?? metadata;
    metadataHandle.set(`risk_${riskId}_status`, 'processing');

    await createRiskMitigationComment(risk, policies, organizationId, authorId);

    // Mark risk as closed and assign to owner/admin
    await db.risk.update({
      where: { id: risk.id, organizationId },
      data: {
        status: RiskStatus.closed,
        assigneeId: authorId,
      },
    });

    // Mark as completed after mitigation is done
    // Update root onboarding task metadata if available
    metadataHandle.set(`risk_${riskId}_status`, 'completed');
    metadataHandle.increment('risksCompleted', 1);
    metadataHandle.decrement('risksRemaining', 1);

    // Revalidate only the risk detail page in the individual job
    try {
      const detailPath = `/${organizationId}/risk/${riskId}`;
      const url = `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/revalidate/path`;
      logger.info('url', { url });
      await axios.post(
        url,
        {
          path: detailPath,
          secret: process.env.REVALIDATION_SECRET,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      logger.info(`Revalidated risk path: ${detailPath}`);
    } catch (e) {
      logger.error('Failed to revalidate risk paths after mitigation', { e });
    }
  },
});

export const generateRiskMitigationsForOrg = task({
  id: 'generate-risk-mitigations-for-org',
  queue: riskMitigationFanoutQueue,
  run: async (payload: { organizationId: string }) => {
    const { organizationId } = payload;
    logger.info(`Fan-out risk mitigations for org ${organizationId}`);

    const [risks, policyRows, author] = await Promise.all([
      db.risk.findMany({ where: { organizationId } }),
      db.policy.findMany({
        where: { organizationId },
        select: { name: true, description: true },
      }),
      findCommentAuthor(organizationId),
    ]);

    if (risks.length === 0) {
      logger.info(`No risks found for org ${organizationId}`);
      return;
    }

    if (!author) {
      logger.warn(
        `No onboarding author found for org ${organizationId}; skipping risk mitigations`,
      );
      return;
    }

    const policies = policyRows.map((p) => ({ name: p.name, description: p.description }));

    await generateRiskMitigation.batchTrigger(
      risks.map((r) => ({
        payload: {
          organizationId,
          riskId: r.id,
          authorId: author.id,
          policies,
        },
        concurrencyKey: `${organizationId}:${r.id}`,
      })),
    );

    // Revalidate the parent risk routes after batch triggering
    try {
      const listPath = `/${organizationId}/risk`;
      await Promise.all([
        axios.post(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/revalidate/path`, {
          path: listPath,
          secret: process.env.REVALIDATION_SECRET,
        }),
      ]);
      logger.info(`Revalidated risk parent paths: ${listPath}`);
    } catch (e) {
      logger.error('Failed to revalidate risk parent paths after batch', { e });
    }
  },
});
