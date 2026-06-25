import { getManifest, runAllChecks } from '@trycompai/integration-platform';
import { db } from '@db';
import { logger, tags, task } from '@trigger.dev/sdk';
import { isCheckDisabledForTask } from '../../integration-platform/utils/disabled-task-checks';
import {
  getAccessToken,
  requestValidCredentials,
  type IntegrationCredentialValues,
} from './ensure-valid-credentials';
import {
  runChecksOnServer,
  type RunAllChecksResult,
} from './run-checks-on-server';
import {
  isActiveDynamicProvider,
  shouldRunOnServer,
} from './dynamic-provider';
import { loadActiveExceptionSet } from '../../cloud-security/finding-exceptions';
import {
  countEffectiveFailures,
  decideTaskStatus,
  splitFailuresByDisposition,
  failureSignalsFromEvidence,
  type ClassifiableFailure,
} from '../../integration-platform/utils/task-check-evaluation';

/**
 * Result of one task's integration-check run. The per-org runner
 * (run-org-integration-checks) reads the success branch to bundle every task
 * that freshly transitioned into `failed` into a single email per recipient.
 */
export type TaskCheckRunResult =
  | {
      success: true;
      taskId: string;
      taskTitle: string;
      checksRun: number;
      totalPassing: number;
      totalFindings: number;
      taskStatus: 'failed' | 'done' | null;
      statusChangedToFailed: boolean;
      failedCount: number;
      totalCount: number;
    }
  | { success: false; taskId?: string; error: string };

/**
 * Worker task that runs integration checks for a single task.
 * Triggered by the orchestrator (integration-checks-schedule).
 *
 * This worker no longer sends a per-task status-change email. The orchestrator
 * fans these out one run per task, so emailing here produced one email per
 * failing task (spam). Instead the per-task run REPORTS the transition back to
 * its per-org parent (run-org-integration-checks), which bundles every task
 * that failed in the run into a single email per recipient.
 */
export const runTaskIntegrationChecks = task({
  id: 'run-task-integration-checks',
  maxDuration: 1000 * 60 * 15, // 15 minutes per task
  run: async (payload: {
    taskId: string;
    taskTitle: string;
    connectionId: string;
    providerSlug: string;
    organizationId: string;
    checkIds: string[];
  }): Promise<TaskCheckRunResult> => {
    const {
      taskId,
      taskTitle,
      connectionId,
      providerSlug,
      organizationId,
      checkIds,
    } = payload;

    await tags.add([`org:${organizationId}`]);

    logger.info(`Running integration checks for task "${taskTitle}"`, {
      taskId,
      connectionId,
      provider: providerSlug,
      checkCount: checkIds.length,
    });

    const manifest = getManifest(providerSlug);

    // Dynamic (DB-backed) providers have no manifest in the Trigger.dev runtime,
    // so run their checks ON OUR SERVER (like AWS), where the dynamic-manifest
    // loader has populated the registry. Static providers keep running here.
    const isDynamic = manifest
      ? false
      : await isActiveDynamicProvider(providerSlug);
    const runOnServer = shouldRunOnServer({
      providerSlug,
      hasManifest: !!manifest,
      isActiveDynamic: isDynamic,
    });

    // Only a truly unknown provider (no manifest AND not delegated) is a dead
    // end; dynamic providers are delegated below instead of failing here.
    if (!manifest && !runOnServer) {
      logger.error(`Manifest not found for provider: ${providerSlug}`);
      return { success: false, error: `Manifest not found: ${providerSlug}` };
    }

    // Get connection
    const connection = await db.integrationConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.status !== 'active') {
      logger.error(`Connection not found or inactive: ${connectionId}`);
      return { success: false, error: 'Connection not found or inactive' };
    }

    const apiUrl = process.env.BASE_URL || 'http://localhost:3333';

    // Server-delegated checks (AWS + dynamic providers) decrypt credentials and
    // run ON OUR SERVER, so the Trigger-side credential/session preflight is
    // skipped for them — running it would add redundant failure points (a
    // transient preflight error would falsely fail a run that
    // `runChecksOnServer` could have completed). The `&& manifest` is a no-op at
    // runtime (a non-delegated provider always has a manifest by here) that lets
    // TypeScript narrow `manifest` for the in-process branch below.
    let credentials: IntegrationCredentialValues = {};
    let handleTokenRefresh: (() => Promise<string | null>) | undefined;

    if (!runOnServer && manifest) {
      logger.info('Ensuring valid credentials (refreshing if needed)...');
      const credentialsResult = await requestValidCredentials({
        apiUrl,
        connectionId,
        organizationId,
      });

      if (!credentialsResult.success || !credentialsResult.credentials) {
        const errorMessage =
          credentialsResult.error || 'Failed to validate credentials';
        logger.error(errorMessage);

        // If unauthorized, mark connection as error
        if (credentialsResult.status === 401) {
          await db.integrationConnection.update({
            where: { id: connectionId },
            data: {
              status: 'error',
              errorMessage,
            },
          });
        }

        return { success: false, error: errorMessage };
      }
      credentials = credentialsResult.credentials;
      logger.info('Credentials validated successfully');

      handleTokenRefresh = async (): Promise<string | null> => {
        logger.info('Force refreshing OAuth credentials after provider 401...');
        const refreshResult = await requestValidCredentials({
          apiUrl,
          connectionId,
          organizationId,
          forceRefresh: true,
        });

        if (!refreshResult.success || !refreshResult.credentials) {
          logger.error(refreshResult.error || 'Forced token refresh failed');
          return null;
        }

        credentials = refreshResult.credentials;
        return getAccessToken(credentials) ?? null;
      };

      // Validate credentials based on auth type
      if (manifest.auth.type === 'oauth2' && !getAccessToken(credentials)) {
        logger.error(
          `No OAuth access token found for connection: ${connectionId}`,
        );
        return {
          success: false,
          error: 'No OAuth access token found. Please reconnect.',
        };
      }

      if (
        manifest.auth.type === 'custom' &&
        Object.keys(credentials).length === 0
      ) {
        logger.error(
          `No credentials found for custom integration: ${connectionId}`,
        );
        return {
          success: false,
          error: 'No credentials found for custom integration',
        };
      }
    }

    const variables =
      (connection.variables as Record<
        string,
        string | number | boolean | string[] | undefined
      >) || {};

    // Defensive per-task disable filter: the orchestrator already removes
    // disabled checks, but a user may disconnect a check between batching and
    // execution. Re-resolve the disabled set from the just-fetched connection
    // metadata and skip anything that's now disabled. The rest of the flow
    // (lastSyncAt update, task status evaluation, return payload) runs as
    // before — just over the filtered list instead of the original one.
    const effectiveCheckIds = checkIds.filter(
      (id) => !isCheckDisabledForTask(connection.metadata, taskId, id),
    );
    if (effectiveCheckIds.length < checkIds.length) {
      logger.info(
        `Skipping ${
          checkIds.length - effectiveCheckIds.length
        } disabled check(s) for task ${taskId}`,
      );
    }

    // Track overall results across all checks for this task
    let totalFindings = 0;
    let totalPassing = 0;
    let hasExecutionErrors = false;
    // Failing findings (keyed like an exception) so task status can exclude
    // explicitly-excepted ones below. Carries redacted error signals so the
    // self-heal layer can classify our-side failures (dynamic integrations).
    const failingFindings: ClassifiableFailure[] = [];

    // Run only the checks that apply to this task
    try {
      for (const checkId of effectiveCheckIds) {
        // Server-delegated providers (AWS + dynamic) run ON OUR SERVER so their
        // checks egress our VPC / resolve their DB-backed manifest there.
        // Static providers keep executing here in the Trigger.dev runtime,
        // unchanged. The result shape is identical either way, so all the
        // persistence / status / email logic below is shared.
        let result: RunAllChecksResult;
        try {
          if (runOnServer) {
            result = await runChecksOnServer({
              apiUrl,
              connectionId,
              organizationId,
              checkId,
            });
          } else if (manifest) {
            result = await runAllChecks({
              manifest,
              accessToken: getAccessToken(credentials),
              credentials,
              variables,
              connectionId,
              organizationId,
              checkId, // Run specific check
              onTokenRefresh:
                manifest.auth.type === 'oauth2'
                  ? handleTokenRefresh
                  : undefined,
              logger: {
                info: (msg, data) => logger.info(msg, data),
                warn: (msg, data) => logger.warn(msg, data),
                error: (msg, data) => logger.error(msg, data),
              },
            });
          } else {
            // Unreachable: guarded at the top (no manifest ⇒ runOnServer). Kept
            // so the type checker knows `result` is always assigned.
            throw new Error(`Manifest not found: ${providerSlug}`);
          }
        } catch (error) {
          // Only the server-run path is degraded here. In-process providers run
          // via runAllChecks, which catches per-check failures and returns
          // status:'error' rather than throwing — so a throw on the in-process
          // branch is unexpected and must NOT be silently downgraded. Re-throw
          // it to preserve the pre-change behavior (it propagates to the outer
          // catch and fails the task).
          if (!runOnServer) throw error;

          // Server-run threw, and only on a transport blip (network/non-2xx) —
          // per-check execution errors come back inside the result, not thrown.
          // Record THIS check as errored and keep going so one blip doesn't abort
          // its sibling checks (multiple checks share a task) or skip the
          // lastSyncAt/status updates, mirroring runAllChecks' per-check
          // resilience. hasExecutionErrors keeps integrationLastRunAt unwritten,
          // so the next orchestrator tick retries. `manifest` is undefined for
          // dynamic providers, so resolve the check name defensively.
          const message =
            error instanceof Error ? error.message : String(error);
          const checkDef = manifest?.checks?.find((c) => c.id === checkId);
          // A transport blip is indeterminate, not a finding: it gates
          // integrationLastRunAt (retry next tick) but must not fail the task.
          hasExecutionErrors = true;
          await db.integrationCheckRun.create({
            data: {
              connectionId,
              taskId,
              checkId,
              checkName: checkDef?.name ?? checkId,
              status: 'failed',
              startedAt: new Date(),
              completedAt: new Date(),
              durationMs: 0,
              totalChecked: 0,
              passedCount: 0,
              failedCount: 0,
              errorMessage: message,
            },
          });
          logger.error(
            `Server-run failed for check ${checkId} on task ${taskId}: ${message}`,
          );
          continue;
        }

        const checkResult = result.results[0];
        if (!checkResult) continue;

        // Accumulate results. Record each failing finding (keyed like an
        // exception) so task status can exclude explicitly-excepted ones.
        totalFindings += checkResult.result.findings.length;
        totalPassing += checkResult.result.passingResults.length;
        for (const f of checkResult.result.findings) {
          failingFindings.push({
            connectionId,
            checkId: checkResult.checkId,
            resourceId: f.resourceId,
            // Redacted error signals so the self-heal layer can classify
            // our-side/transient failures and hold them as inconclusive.
            ...failureSignalsFromEvidence(f.evidence, checkResult.status),
          });
        }
        if (checkResult.status === 'error') {
          hasExecutionErrors = true;
        }

        // Store check run
        const checkRun = await db.integrationCheckRun.create({
          data: {
            connectionId,
            taskId,
            checkId: checkResult.checkId,
            checkName: checkResult.checkName,
            status:
              checkResult.status === 'error' ? 'failed' : checkResult.status,
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: checkResult.durationMs,
            totalChecked:
              checkResult.result.summary?.totalChecked ||
              checkResult.result.passingResults.length +
                checkResult.result.findings.length,
            passedCount: checkResult.result.passingResults.length,
            failedCount: checkResult.result.findings.length,
            errorMessage: checkResult.error,
            logs: JSON.parse(JSON.stringify(checkResult.result.logs)),
          },
        });

        // Store individual results
        const resultsToStore = [
          ...checkResult.result.passingResults.map((r) => ({
            checkRunId: checkRun.id,
            passed: true,
            resourceType: r.resourceType,
            resourceId: r.resourceId,
            title: r.title,
            description: r.description,
            evidence: r.evidence
              ? JSON.parse(JSON.stringify(r.evidence))
              : undefined,
          })),
          ...checkResult.result.findings.map((f) => ({
            checkRunId: checkRun.id,
            passed: false,
            resourceType: f.resourceType,
            resourceId: f.resourceId,
            title: f.title,
            description: f.description,
            severity: f.severity,
            remediation: f.remediation,
            evidence: f.evidence
              ? JSON.parse(JSON.stringify(f.evidence))
              : undefined,
          })),
        ];

        if (resultsToStore.length > 0) {
          await db.integrationCheckResult.createMany({ data: resultsToStore });
        }

        logger.info(`Completed check ${checkId} for task ${taskId}`, {
          passed: checkResult.result.passingResults.length,
          findings: checkResult.result.findings.length,
        });
      }

      // Update connection's lastSyncAt
      await db.integrationConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() },
      });

      // Record a successful run on the task so the orchestrator's schedule
      // filter (`isDueToday`) can skip it on the next tick. "Successful" here
      // means every check executed — including checks that legitimately found
      // violations (`status: 'failed'`). We skip the write only when a check
      // couldn't execute (`status: 'error'`, e.g. transient provider error),
      // so the next orchestrator tick retries instead of waiting a full period.
      if (!hasExecutionErrors) {
        await db.task.update({
          where: { id: taskId },
          data: { integrationLastRunAt: new Date() },
        });
      }

      // Decide task status from the run, HONORING active finding exceptions so
      // an explicitly-excepted finding does not fail the task — matched with the
      // manual run-check path and the Cloud Tests findings view (one rule, via
      // the shared helpers). Execution errors don't drive status here; they gate
      // integrationLastRunAt above so the next tick retries.
      const exceptions = await loadActiveExceptionSet(organizationId);
      // For DYNAMIC integrations, hold our-side/transient failures as
      // inconclusive: they must not fail the task or send a "task failed" email —
      // the self-heal layer investigates/fixes them. Static/AWS behavior is
      // unchanged. Safe degradation: a finding with no readable error signal
      // classifies as a real (compliance) failure, exactly as today.
      const statusFailures = isDynamic
        ? splitFailuresByDisposition(failingFindings).effective
        : failingFindings;
      const heldCount = failingFindings.length - statusFailures.length;
      if (heldCount > 0) {
        logger.info(
          `Held ${heldCount} our-side/transient finding(s) as inconclusive for task ${taskId} (not shown as failed)`,
        );
      }
      const effectiveFailures = countEffectiveFailures(
        statusFailures,
        exceptions,
      );
      // Held findings are indeterminate (like an all-errored run) — they must not
      // flip the task to "done" either, so exclude them from the finding count.
      const newStatus = decideTaskStatus(
        effectiveFailures,
        totalPassing,
        totalFindings - heldCount,
      );

      // Whether THIS run flipped the task into `failed` (e.g. todo/done →
      // failed). The per-org runner bundles only these transitions into one
      // email, so a task that was already failed isn't re-reported every run —
      // preserving the previous "only notify on transition" behavior.
      let statusChangedToFailed = false;

      if (newStatus === 'failed') {
        // Get current status before updating
        const taskBeforeUpdate = await db.task.findUnique({
          where: { id: taskId },
          select: { status: true },
        });
        const oldStatus = taskBeforeUpdate?.status ?? 'todo';

        await db.task.update({
          where: { id: taskId },
          data: { status: 'failed' },
        });
        logger.info(
          `Task ${taskId} marked as failed due to ${effectiveFailures} finding(s)`,
        );

        statusChangedToFailed = oldStatus !== 'failed';
        if (!statusChangedToFailed) {
          logger.info(
            `Task ${taskId} was already in failed status; not reporting it for the bundled email`,
          );
        }
      } else if (newStatus === 'done') {
        // Only update to done if not already done
        const currentTask = await db.task.findUnique({
          where: { id: taskId },
          select: { status: true, frequency: true },
        });
        if (currentTask && currentTask.status !== 'done') {
          // Calculate next review date based on frequency
          let reviewDate: Date | undefined;
          if (currentTask.frequency) {
            reviewDate = new Date();
            switch (currentTask.frequency) {
              case 'monthly':
                reviewDate.setMonth(reviewDate.getMonth() + 1);
                break;
              case 'quarterly':
                reviewDate.setMonth(reviewDate.getMonth() + 3);
                break;
              case 'yearly':
                reviewDate.setFullYear(reviewDate.getFullYear() + 1);
                break;
            }
          }

          await db.task.update({
            where: { id: taskId },
            data: {
              status: 'done',
              ...(reviewDate ? { reviewDate } : {}),
            },
          });
          logger.info(
            `Task ${taskId} marked as done - all ${totalPassing} checks passed${reviewDate ? `, next review: ${reviewDate.toISOString()}` : ''}`,
          );
        }
      }

      return {
        success: true,
        taskId,
        taskTitle,
        checksRun: effectiveCheckIds.length,
        totalPassing,
        totalFindings,
        taskStatus: newStatus,
        // Consumed by the per-org bundled-failure email
        // (run-org-integration-checks). `statusChangedToFailed` gates inclusion;
        // failedCount/totalCount feed the "(X/Y failed)" line per task.
        statusChangedToFailed,
        failedCount: effectiveFailures,
        totalCount: totalPassing + totalFindings,
      };
    } catch (error) {
      logger.error(`Failed to run checks for task ${taskId}`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
