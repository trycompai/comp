import { db } from '@db/server';
import { logger, metadata, task } from '@trigger.dev/sdk';

type FindingStatus = 'pending' | 'fixing' | 'fixed' | 'skipped' | 'failed' | 'cancelled' | 'needs_permissions';

interface FindingProgress {
  id: string;
  key: string;
  title: string;
  status: FindingStatus;
  error?: string;
  /** Per-finding missing permissions (only for needs_permissions status) */
  missingPermissions?: string[];
}

interface BatchProgress {
  current: number;
  total: number;
  fixed: number;
  skipped: number;
  failed: number;
  findings: FindingProgress[];
  phase: 'running' | 'waiting_for_permissions' | 'retrying' | 'scanning' | 'done' | 'cancelled';
  permChecksLeft?: number;
  /** All confirmed-available permissions (dedup: don't ask for these again) */
  confirmedPermissions?: string[];
}

const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3333';

function makeHeaders(organizationId: string, userId?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-service-token': process.env.SERVICE_TOKEN_TRIGGER!,
    'x-organization-id': organizationId,
    ...(userId && { 'x-user-id': userId }),
  };
}

async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  organizationId: string,
  userId?: string,
): Promise<{ data?: T; error?: string }> {
  const url = `${getApiBaseUrl()}${path}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: makeHeaders(organizationId, userId),
      body: JSON.stringify(body),
    });
    const json = await resp.json();
    if (!resp.ok) {
      return { error: (json as { message?: string }).message ?? `HTTP ${resp.status}` };
    }
    return { data: json as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function sync(progress: BatchProgress) {
  metadata.set('progress', JSON.parse(JSON.stringify(progress)));
}

interface PreviewResult {
  guidedOnly?: boolean;
  missingPermissions?: string[];
  allRequiredPermissions?: string[];
}

/** Try to fix a single finding. Returns result + which permissions it needed. */
async function tryFix(
  finding: FindingProgress,
  connectionId: string,
  organizationId: string,
  userId?: string,
): Promise<{ status: FindingStatus; error?: string; missingPerms?: string[] }> {
  const preview = await apiPost<PreviewResult>(
    '/v1/cloud-security/remediation/preview',
    { connectionId, checkResultId: finding.id, remediationKey: finding.key },
    organizationId,
    userId,
  );

  if (preview.error) return { status: 'failed', error: preview.error };
  if (preview.data?.guidedOnly) return { status: 'skipped', error: 'Requires manual fix' };

  if (preview.data?.missingPermissions && preview.data.missingPermissions.length > 0) {
    return {
      status: 'needs_permissions',
      missingPerms: preview.data.missingPermissions,
    };
  }

  const execute = await apiPost<{ status: string; error?: string }>(
    '/v1/cloud-security/remediation/execute',
    { connectionId, checkResultId: finding.id, remediationKey: finding.key, acknowledgment: 'acknowledged' },
    organizationId,
    userId,
  );

  if (execute.error || execute.data?.status === 'failed') {
    return { status: 'failed', error: execute.error ?? execute.data?.error ?? 'Unknown error' };
  }

  return { status: 'fixed' };
}

async function isCancelled(batchId: string): Promise<boolean> {
  const b = await db.remediationBatch.findUnique({ where: { id: batchId }, select: { status: true } });
  return !b || b.status === 'cancelled';
}

async function isFindingCancelled(batchId: string, findingId: string): Promise<boolean> {
  const b = await db.remediationBatch.findUnique({ where: { id: batchId }, select: { findings: true } });
  if (!b) return true;
  const findings = b.findings as unknown as FindingProgress[];
  return findings.find((f) => f.id === findingId)?.status === 'cancelled';
}

async function persistProgress(batchId: string, progress: BatchProgress) {
  await db.remediationBatch.update({
    where: { id: batchId },
    data: {
      findings: JSON.parse(JSON.stringify(progress.findings)),
      fixed: progress.fixed,
      skipped: progress.skipped,
      failed: progress.failed,
    },
  });
}

export const remediateBatch = task({
  id: 'remediate-batch',
  maxDuration: 1000 * 60 * 30,
  retry: { maxAttempts: 1 },
  run: async (payload: {
    batchId: string;
    organizationId: string;
    connectionId: string;
  }) => {
    const { batchId, organizationId, connectionId } = payload;

    const batch = await db.remediationBatch.findUnique({ where: { id: batchId } });
    if (!batch) return { success: false, error: 'Batch not found' };

    const findings = batch.findings as unknown as FindingProgress[];
    const userId = batch.initiatedById; // pass to API for audit trail
    logger.info(`Batch ${batchId}: ${findings.length} findings (user: ${userId})`);

    await db.remediationBatch.update({ where: { id: batchId }, data: { status: 'running' } });

    const confirmed = new Set<string>(); // permissions we know exist on the role
    const progress: BatchProgress = {
      current: 0,
      total: findings.length,
      fixed: 0,
      skipped: 0,
      failed: 0,
      findings,
      phase: 'running',
      confirmedPermissions: [],
    };
    sync(progress);

    // ─── Pass 1: Process all findings, never stop ───
    for (let i = 0; i < findings.length; i++) {
      if (await isCancelled(batchId)) { progress.phase = 'cancelled'; sync(progress); break; }
      if (await isFindingCancelled(batchId, findings[i]!.id)) {
        progress.findings[i]!.status = 'cancelled';
        progress.skipped++;
        progress.current = i + 1;
        sync(progress);
        await persistProgress(batchId, progress);
        continue;
      }

      progress.current = i + 1;
      progress.findings[i]!.status = 'fixing';
      sync(progress);

      logger.info(`[${i + 1}/${findings.length}] ${findings[i]!.title}`);
      const result = await tryFix(findings[i]!, connectionId, organizationId, userId);

      if (result.status === 'fixed') {
        progress.findings[i]!.status = 'fixed';
        progress.fixed++;
        // This finding's required permissions are confirmed available
        if (result.missingPerms) result.missingPerms.forEach((p) => confirmed.add(p));
      } else if (result.status === 'needs_permissions') {
        // Only show permissions we haven't confirmed as available
        const stillMissing = (result.missingPerms ?? []).filter((p) => !confirmed.has(p));
        if (stillMissing.length === 0) {
          // All permissions already confirmed — retry immediately
          logger.info(`All perms already confirmed, retrying ${findings[i]!.title}`);
          const retry = await tryFix(findings[i]!, connectionId, organizationId, userId);
          progress.findings[i]!.status = retry.status === 'fixed' ? 'fixed' : 'failed';
          progress.findings[i]!.error = retry.error;
          if (retry.status === 'fixed') progress.fixed++;
          else progress.failed++;
        } else {
          progress.findings[i]!.status = 'needs_permissions';
          progress.findings[i]!.missingPermissions = stillMissing;
          progress.skipped++;
        }
      } else if (result.status === 'skipped') {
        progress.findings[i]!.status = 'skipped';
        progress.findings[i]!.error = result.error;
        progress.skipped++;
      } else {
        progress.findings[i]!.status = 'failed';
        progress.findings[i]!.error = result.error;
        progress.failed++;
      }

      progress.confirmedPermissions = [...confirmed];
      sync(progress);
      await persistProgress(batchId, progress);
    }

    // ─── Pass 2: Recheck permission-blocked findings ───
    const needsPerms = () => progress.findings
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.status === 'needs_permissions');

    const MAX_CHECKS = 2; // Just a safety net — user has per-finding Retry button for instant action
    const CHECK_INTERVAL = 30_000; // 30s

    if (needsPerms().length > 0 && progress.phase !== 'cancelled') {
      progress.phase = 'waiting_for_permissions';
      progress.permChecksLeft = MAX_CHECKS;
      sync(progress);

      for (let check = 0; check < MAX_CHECKS; check++) {
        if (await isCancelled(batchId)) { progress.phase = 'cancelled'; sync(progress); break; }

        await new Promise((r) => setTimeout(r, CHECK_INTERVAL));
        progress.permChecksLeft = MAX_CHECKS - check - 1;
        sync(progress);

        // Test the first needs_permissions finding
        const blocked = needsPerms();
        if (blocked.length === 0) break;

        const test = blocked[0]!;
        const testResult = await tryFix(test.f, connectionId, organizationId, userId);

        if (testResult.status === 'fixed' || (testResult.status === 'needs_permissions' && (testResult.missingPerms?.length ?? 0) === 0)) {
          // Permissions appeared! Retry ALL blocked findings
          logger.info(`Permissions detected on check ${check + 1} — retrying ${blocked.length} findings`);
          progress.phase = 'retrying';
          sync(progress);

          for (const { f, i } of needsPerms()) {
            if (await isCancelled(batchId)) { progress.phase = 'cancelled'; sync(progress); break; }

            progress.findings[i]!.status = 'fixing';
            progress.findings[i]!.missingPermissions = undefined;
            sync(progress);

            const retry = await tryFix(f, connectionId, organizationId, userId);

            if (retry.status === 'fixed') {
              progress.findings[i]!.status = 'fixed';
              progress.findings[i]!.error = undefined;
              progress.fixed++;
              progress.skipped--;
              if (retry.missingPerms) retry.missingPerms.forEach((p) => confirmed.add(p));
            } else if (retry.status === 'needs_permissions') {
              // Still missing some — update with only truly new missing perms
              const still = (retry.missingPerms ?? []).filter((p) => !confirmed.has(p));
              progress.findings[i]!.status = still.length > 0 ? 'needs_permissions' : 'failed';
              progress.findings[i]!.missingPermissions = still.length > 0 ? still : undefined;
              progress.findings[i]!.error = still.length > 0 ? undefined : 'Still missing permissions after retry';
            } else {
              progress.findings[i]!.status = retry.status;
              progress.findings[i]!.error = retry.error;
              progress.failed++;
              progress.skipped--;
            }

            progress.confirmedPermissions = [...confirmed];
            sync(progress);
            await persistProgress(batchId, progress);
          }
          break;
        }

        // Update the test finding's missing perms (might have partially improved)
        if (testResult.missingPerms) {
          const still = testResult.missingPerms.filter((p) => !confirmed.has(p));
          progress.findings[test.i]!.missingPermissions = still;
          sync(progress);
        }

        logger.info(`Check ${check + 1}/${MAX_CHECKS}: still waiting for permissions`);
      }
    }

    // ─── Re-scan ───
    if (progress.fixed > 0 && progress.phase !== 'cancelled') {
      progress.phase = 'scanning';
      sync(progress);
      await apiPost(`/v1/cloud-security/scan/${connectionId}`, {}, organizationId, userId);
    }

    progress.phase = progress.phase === 'cancelled' ? 'cancelled' : 'done';
    sync(progress);

    await db.remediationBatch.update({
      where: { id: batchId },
      data: {
        status: progress.phase === 'cancelled' ? 'cancelled' : 'done',
        findings: JSON.parse(JSON.stringify(progress.findings)),
        fixed: progress.fixed,
        skipped: progress.skipped,
        failed: progress.failed,
      },
    });

    return { success: true, fixed: progress.fixed, skipped: progress.skipped, failed: progress.failed };
  },
});
