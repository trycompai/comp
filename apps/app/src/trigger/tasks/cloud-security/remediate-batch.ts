import { db } from '@db/server';
import { logger, task } from '@trigger.dev/sdk';
import { postCloudSecurityApi } from './api-response';
import {
  type BatchProgress,
  type FindingProgress,
  isCancelled,
  isFindingCancelled,
  persistProgress,
  sync,
  tryFix,
} from './remediate-batch-helpers';

export const remediateBatch = task({
  id: 'remediate-batch',
  maxDuration: 60 * 30, // 30 minutes (seconds, not ms)
  retry: { maxAttempts: 1 },
  run: async (payload: { batchId: string; organizationId: string; connectionId: string }) => {
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
      if (await isCancelled(batchId)) {
        progress.phase = 'cancelled';
        sync(progress);
        break;
      }
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
      await persistProgress(batchId, progress);
      if (
        progress.findings[i]!.status === 'cancelled' ||
        (await isFindingCancelled(batchId, findings[i]!.id))
      ) {
        progress.findings[i]!.status = 'cancelled';
        await persistProgress(batchId, progress);
        sync(progress);
        continue;
      }

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
    const needsPerms = () =>
      progress.findings
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => f.status === 'needs_permissions');

    const MAX_CHECKS = 2; // Just a safety net — user has per-finding Retry button for instant action
    const CHECK_INTERVAL = 30_000; // 30s

    if (needsPerms().length > 0 && progress.phase !== 'cancelled') {
      progress.phase = 'waiting_for_permissions';
      progress.permChecksLeft = MAX_CHECKS;
      sync(progress);

      for (let check = 0; check < MAX_CHECKS; check++) {
        if (await isCancelled(batchId)) {
          progress.phase = 'cancelled';
          sync(progress);
          break;
        }

        await new Promise((r) => setTimeout(r, CHECK_INTERVAL));
        progress.permChecksLeft = MAX_CHECKS - check - 1;
        sync(progress);

        // Test the first needs_permissions finding
        const blocked = needsPerms();
        if (blocked.length === 0) break;

        const test = blocked[0]!;
        const testResult = await tryFix(test.f, connectionId, organizationId, userId);

        if (
          testResult.status === 'fixed' ||
          (testResult.status === 'needs_permissions' &&
            (testResult.missingPerms?.length ?? 0) === 0)
        ) {
          // Permissions appeared! Retry ALL blocked findings
          logger.info(
            `Permissions detected on check ${check + 1} — retrying ${blocked.length} findings`,
          );
          progress.phase = 'retrying';
          sync(progress);

          for (const { f, i } of needsPerms()) {
            if (await isCancelled(batchId)) {
              progress.phase = 'cancelled';
              sync(progress);
              break;
            }

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
              progress.findings[i]!.error =
                still.length > 0 ? undefined : 'Still missing permissions after retry';
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
      await postCloudSecurityApi({
        path: `/v1/cloud-security/scan/${connectionId}`,
        body: {},
        organizationId,
        userId,
      });
    }

    progress.phase = progress.phase === 'cancelled' ? 'cancelled' : 'done';
    sync(progress);

    await persistProgress(batchId, progress, progress.phase === 'cancelled' ? 'cancelled' : 'done');

    return {
      success: true,
      fixed: progress.fixed,
      skipped: progress.skipped,
      failed: progress.failed,
    };
  },
});
