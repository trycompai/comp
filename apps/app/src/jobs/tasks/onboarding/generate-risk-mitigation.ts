import { RiskStatus, db } from '@db';
import { logger, queue, task } from '@trigger.dev/sdk';
import {
  createRiskMitigationComment,
  findCommentAuthor,
  type PolicyContext,
} from './onboard-organization-helpers';

// Queues
const riskMitigationQueue = queue({ name: 'risk-mitigations', concurrencyLimit: 10 });
const riskMitigationFanoutQueue = queue({ name: 'risk-mitigations-fanout', concurrencyLimit: 3 });

export const generateRiskMitigation = task({
  id: 'generate-risk-mitigation',
  queue: riskMitigationQueue,
  run: async (payload: { organizationId: string; riskId: string }) => {
    const { organizationId, riskId } = payload;
    logger.info(`Generating risk mitigation for risk ${riskId} in org ${organizationId}`);

    const [risk, policies, author] = await Promise.all([
      db.risk.findFirst({ where: { id: riskId, organizationId } }),
      db.policy.findMany({ where: { organizationId }, select: { name: true, description: true } }),
      findCommentAuthor(organizationId),
    ]);

    if (!risk) {
      logger.warn(`Risk ${riskId} not found in org ${organizationId}`);
      return;
    }

    if (!author) {
      logger.warn(
        `No eligible author found for org ${organizationId}; skipping mitigation for risk ${riskId}`,
      );
      return;
    }

    await createRiskMitigationComment(risk, policies as PolicyContext[], organizationId, author.id);

    // Mark risk as closed and assign to owner/admin
    await db.risk.update({
      where: { id: risk.id, organizationId },
      data: {
        status: RiskStatus.closed,
        assigneeId: author.id,
      },
    });
  },
});

export const generateRiskMitigationsForOrg = task({
  id: 'generate-risk-mitigations-for-org',
  queue: riskMitigationFanoutQueue,
  run: async (payload: { organizationId: string }) => {
    const { organizationId } = payload;
    logger.info(`Fan-out risk mitigations for org ${organizationId}`);

    const risks = await db.risk.findMany({ where: { organizationId } });
    if (risks.length === 0) {
      logger.info(`No risks found for org ${organizationId}`);
      return;
    }

    await generateRiskMitigation.batchTrigger(
      risks.map((r) => ({
        payload: { organizationId, riskId: r.id },
        concurrencyKey: `${organizationId}:${r.id}`,
      })),
    );
  },
});
