import { BackgroundCheckStatus, db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { z } from 'zod';
import { BackgroundCheckIdentityClient } from '../../background-checks/background-check-identity.client';
import { fetchCompletedReportSnapshot } from '../../background-checks/background-check-report-snapshot';
import { backgroundCheckStatuses } from '../../background-checks/background-checks.types';

// Checks in these states are still in flight and can still advance. Terminal
// states (completed/completed_with_flags/failed/cancelled) are left untouched.
const NON_TERMINAL_STATUSES: BackgroundCheckStatus[] = [
  BackgroundCheckStatus.invited,
  BackgroundCheckStatus.in_progress,
  BackgroundCheckStatus.in_review,
];

// Only reconcile checks whose last sync is older than this, so the poller backs
// off and lets the Identity webhook stay the primary update path.
const STALE_AFTER_MS = 60 * 60 * 1000;

const SUB_STATUS_SCHEMA = z
  .object({
    identity: z.string(),
    employment: z.string(),
    references: z.string(),
    rightToWork: z.string(),
    adjudication: z.string(),
  })
  .partial();

interface ReconciliationResult {
  success: boolean;
  checked: number;
  updated: number;
  unparseable: number;
}

/**
 * Identity's GET /v1/background-checks/:id returns the full check resource. We
 * only need the lifecycle `status` (+ granular sub-statuses) to recover a check
 * whose webhook never arrived (CS-473). The response is otherwise loosely
 * structured, so parse defensively: an absent/invalid `status` means "can't
 * determine", and we leave the record untouched rather than guess.
 */
export function parseIdentityCheckState(raw: unknown): {
  status?: BackgroundCheckStatus;
  statuses?: z.infer<typeof SUB_STATUS_SCHEMA>;
} {
  const parsed = z
    .object({
      status: z.enum(backgroundCheckStatuses).optional(),
      statuses: SUB_STATUS_SCHEMA.optional(),
    })
    .passthrough()
    .safeParse(raw);

  if (!parsed.success) return {};
  return { status: parsed.data.status, statuses: parsed.data.statuses };
}

/**
 * Polls Identity for stale in-flight background checks and applies any status it
 * reports — recovering checks whose webhook was missed (CS-473). Background
 * check status is normally driven by Identity webhooks; this is the fallback.
 */
export async function runReconciliation(payload: {
  timestamp: Date;
}): Promise<ReconciliationResult> {
  if (!process.env.BACKGROUND_CHECK_API_KEY) {
    logger.warn(
      'BACKGROUND_CHECK_API_KEY not configured — skipping reconciliation',
    );
    return { success: true, checked: 0, updated: 0, unparseable: 0 };
  }

  const staleBefore = new Date(payload.timestamp.getTime() - STALE_AFTER_MS);

  const stuckChecks = await db.backgroundCheckRequest.findMany({
    where: {
      status: { in: NON_TERMINAL_STATUSES },
      identityBackgroundCheckId: { not: null },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }],
    },
    select: { id: true, identityBackgroundCheckId: true, status: true },
  });

  if (stuckChecks.length === 0) {
    logger.info('No stale in-flight background checks to reconcile');
    return { success: true, checked: 0, updated: 0, unparseable: 0 };
  }

  logger.info(`Reconciling ${stuckChecks.length} stale background check(s)`);

  const identityClient = new BackgroundCheckIdentityClient();
  let updated = 0;
  let unparseable = 0;

  for (const check of stuckChecks) {
    const identityId = check.identityBackgroundCheckId;
    if (!identityId) continue;

    let raw: unknown;
    try {
      raw = await identityClient.getBackgroundCheck(identityId);
    } catch (error) {
      logger.error('Failed to fetch Identity background check', {
        backgroundCheckRequestId: check.id,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const { status: nextStatus, statuses } = parseIdentityCheckState(raw);
    if (!nextStatus) {
      unparseable += 1;
      continue;
    }

    if (nextStatus === check.status) {
      // No change yet — bump the sync time so we back off next tick.
      await db.backgroundCheckRequest.update({
        where: { id: check.id },
        data: { lastSyncedAt: new Date() },
      });
      continue;
    }

    const reportSnapshot = await fetchCompletedReportSnapshot({
      identityClient,
      identityBackgroundCheckId: identityId,
      eventType: 'reconcile',
      status: nextStatus,
    });

    await db.backgroundCheckRequest.update({
      where: { id: check.id },
      data: {
        status: nextStatus,
        identityStatus: statuses?.identity ?? null,
        employmentStatus: statuses?.employment ?? null,
        referenceStatus: statuses?.references ?? null,
        rightToWorkStatus: statuses?.rightToWork ?? null,
        adjudicationStatus: statuses?.adjudication ?? null,
        lastSyncedAt: new Date(),
        ...(reportSnapshot
          ? { reportSnapshot, reportSyncedAt: new Date() }
          : {}),
      },
    });

    updated += 1;
    logger.info('Reconciled background check status', {
      backgroundCheckRequestId: check.id,
      from: check.status,
      to: nextStatus,
    });
  }

  logger.info('Background-check reconciliation complete', {
    checked: stuckChecks.length,
    updated,
    unparseable,
  });

  return { success: true, checked: stuckChecks.length, updated, unparseable };
}

/**
 * Hourly schedule (CS-473). Needs the latest deployment to run in prod/staging,
 * and the dev CLI running locally.
 */
export const reconcileBackgroundChecksSchedule = schedules.task({
  id: 'reconcile-background-checks-schedule',
  cron: '0 * * * *', // hourly (UTC)
  maxDuration: 1000 * 60 * 30,
  run: (payload) => runReconciliation(payload),
});
