import { Prisma, RiskStatus, db } from '@db/server';
import { logger, metadata, queue, tags, task, tasks } from '@trigger.dev/sdk';
import axios from 'axios';
import {
  createRiskMitigationComment,
  findCommentAuthor,
  type PolicyContext,
} from './onboard-organization-helpers';

// Queues
const riskMitigationQueue = queue({ name: 'risk-mitigations', concurrencyLimit: 50 });
const riskMitigationFanoutQueue = queue({ name: 'risk-mitigations-fanout', concurrencyLimit: 50 });

/**
 * Builds the "apply onboarding defaults" writes for a risk after a mitigation
 * plan is drafted, WITHOUT clobbering a user-managed risk.
 *
 * generateRiskMitigation re-runs on EXISTING risks — via the "Regenerate"
 * button and via task-unlink (refreshTreatmentPlan) — and those runs land
 * asynchronously AFTER the user may have changed the risk. An unconditional
 * write here silently reopened risks the user had closed ("I mark a risk
 * closed and it comes back as pending"). So each write is scoped:
 *  - status: promote only a still-default `open` risk to `pending` (the AI
 *    drafted a plan that needs review). Never downgrade a user-set
 *    pending/closed/archived.
 *  - assigneeId: assign the author only when the risk is still unassigned —
 *    don't reassign a risk the user has already given an owner.
 *
 * The status/assignee where-clauses also keep this correct against a race
 * where the user edits the risk while this async job is in flight.
 */
export function buildMitigationDefaultWrites(params: {
  riskId: string;
  organizationId: string;
  authorId?: string;
}): Prisma.RiskUpdateManyArgs[] {
  const { riskId, organizationId, authorId } = params;

  const writes: Prisma.RiskUpdateManyArgs[] = [
    {
      where: { id: riskId, organizationId, status: RiskStatus.open },
      data: { status: RiskStatus.pending },
    },
  ];

  if (authorId) {
    writes.push({
      where: { id: riskId, organizationId, assigneeId: null },
      data: { assigneeId: authorId },
    });
  }

  return writes;
}

export const generateRiskMitigation = task({
  id: 'generate-risk-mitigation',
  queue: riskMitigationQueue,
  retry: {
    maxAttempts: 5,
  },
  run: async (payload: {
    organizationId: string;
    riskId: string;
    authorId?: string;
    policies: PolicyContext[];
  }) => {
    const { organizationId, riskId, authorId, policies } = payload;
    await tags.add([`org:${organizationId}`]);
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

    await createRiskMitigationComment(risk, policies, organizationId, authorId ?? '');

    // Apply onboarding defaults without clobbering a user-managed risk — the
    // AI drafted a plan, but the user owns the status/assignee. See
    // buildMitigationDefaultWrites for why each write is scoped.
    for (const write of buildMitigationDefaultWrites({
      riskId: risk.id,
      organizationId,
      authorId,
    })) {
      await db.risk.updateMany(write);
    }

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
    await tags.add([`org:${organizationId}`]);
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
        `No onboarding author found for org ${organizationId}; treatment descriptions will generate but risks will not be reassigned`,
      );
    }

    const policies = policyRows.map((p) => ({ name: p.name, description: p.description }));

    const batchResult = await tasks.batchTriggerAndWait<typeof generateRiskMitigation>(
      'generate-risk-mitigation',
      risks.map((r) => ({
        payload: {
          organizationId,
          riskId: r.id,
          authorId: author?.id,
          policies,
        },
        options: { concurrencyKey: `${organizationId}:${r.id}` },
      })),
    );
    const failures = batchResult.runs.filter((r) => !r.ok);
    if (failures.length > 0) {
      logger.error(`${failures.length} risk mitigation(s) failed`, {
        failedRunIds: failures.map((r) => r.id),
      });
    }

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
