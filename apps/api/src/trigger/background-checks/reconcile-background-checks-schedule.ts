import { BackgroundCheckStatus, db, Prisma } from '@db';
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
 * whose webhook never arrived (CS-473). The response is loosely structured, so
 * parse `status` and `statuses` INDEPENDENTLY: a malformed `statuses` must not
 * drop an otherwise-valid `status`. An absent/invalid `status` means "can't
 * determine" and the record is left untouched.
 */
export function parseIdentityCheckState(raw: unknown): {
  status?: BackgroundCheckStatus;
  statuses?: z.infer<typeof SUB_STATUS_SCHEMA>;
} {
  const record = z.record(z.string(), z.unknown()).safeParse(raw);
  if (!record.success) return {};

  const status = z.enum(backgroundCheckStatuses).safeParse(record.data.status);
  const statuses = SUB_STATUS_SCHEMA.safeParse(record.data.statuses);

  return {
    status: status.success ? status.data : undefined,
    statuses: statuses.success ? statuses.data : undefined,
  };
}

/**
 * Polls Identity for stale in-flight background checks and applies any status it
 * reports — recovering checks whose webhook was missed (CS-473). Background
 * check status is normally driven by Identity webhooks; this is the fallback.
 */
export async function runReconciliation(): Promise<ReconciliationResult> {
  if (!process.env.BACKGROUND_CHECK_API_KEY) {
    logger.warn(
      'BACKGROUND_CHECK_API_KEY not configured — skipping reconciliation',
    );
    return { success: true, checked: 0, updated: 0, unparseable: 0 };
  }

  // Base the stale cutoff on the ACTUAL run time, not the scheduled time — a
  // cron that starts late would otherwise narrow the window and delay recovery.
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

  const stuckChecks = await db.backgroundCheckRequest.findMany({
    where: {
      status: { in: NON_TERMINAL_STATUSES },
      identityBackgroundCheckId: { not: null },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }],
    },
    select: {
      id: true,
      identityBackgroundCheckId: true,
      status: true,
      identityStatus: true,
      employmentStatus: true,
      referenceStatus: true,
      rightToWorkStatus: true,
      adjudicationStatus: true,
    },
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

    // Apply only the fields Identity actually reported AND that differ from what
    // we already have. Never null out a sub-status the GET omitted, and refresh
    // sub-statuses even when the top-level status is unchanged — a check can sit
    // in `in_progress` while `Identity:Pending` advances to passed (CS-473).
    const data: Prisma.BackgroundCheckRequestUpdateManyMutationInput = {};
    if (nextStatus !== check.status) {
      data.status = nextStatus;
    }
    if (
      statuses?.identity !== undefined &&
      statuses.identity !== check.identityStatus
    ) {
      data.identityStatus = statuses.identity;
    }
    if (
      statuses?.employment !== undefined &&
      statuses.employment !== check.employmentStatus
    ) {
      data.employmentStatus = statuses.employment;
    }
    if (
      statuses?.references !== undefined &&
      statuses.references !== check.referenceStatus
    ) {
      data.referenceStatus = statuses.references;
    }
    if (
      statuses?.rightToWork !== undefined &&
      statuses.rightToWork !== check.rightToWorkStatus
    ) {
      data.rightToWorkStatus = statuses.rightToWork;
    }
    if (
      statuses?.adjudication !== undefined &&
      statuses.adjudication !== check.adjudicationStatus
    ) {
      data.adjudicationStatus = statuses.adjudication;
    }

    const hasChange = Object.keys(data).length > 0;
    if (hasChange) {
      const reportSnapshot = await fetchCompletedReportSnapshot({
        identityClient,
        identityBackgroundCheckId: identityId,
        eventType: 'reconcile',
        status: nextStatus,
      });
      if (reportSnapshot) {
        data.reportSnapshot = reportSnapshot;
        data.reportSyncedAt = new Date();
      }
    }
    data.lastSyncedAt = new Date();

    // Concurrency-safe: re-assert the row is still non-terminal in the WHERE, so
    // a check cancelled/completed between selection and now is never resurrected.
    const result = await db.backgroundCheckRequest.updateMany({
      where: { id: check.id, status: { in: NON_TERMINAL_STATUSES } },
      data,
    });

    if (result.count > 0 && hasChange) {
      updated += 1;
      if (data.status) {
        logger.info('Reconciled background check status', {
          backgroundCheckRequestId: check.id,
          from: check.status,
          to: nextStatus,
        });
      }
    }
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
  maxDuration: 30 * 60, // 30 minutes — Trigger.dev maxDuration is in SECONDS

  run: () => runReconciliation(),
});
