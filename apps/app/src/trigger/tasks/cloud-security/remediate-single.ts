import { logger, metadata, task } from '@trigger.dev/sdk';
import {
  getCloudSecurityApiBaseUrl,
  makeServiceTokenHeaders,
  parseApiResponse,
} from './api-response';
import { classifyExecuteResult } from './execute-result';

interface SingleFixProgress {
  phase: 'executing' | 'success' | 'failed' | 'needs_permissions' | 'manual';
  error?: string;
  actionId?: string;
  permissionError?: { missingActions: string[]; fixScript?: string };
  guidedSteps?: string[];
}

function sync(progress: SingleFixProgress) {
  metadata.set('progress', JSON.parse(JSON.stringify(progress)));
}

export const remediateSingle = task({
  id: 'remediate-single',
  maxDuration: 60 * 5, // 5 minutes (seconds, not ms)
  retry: { maxAttempts: 1 },
  run: async (payload: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
    userId: string;
    acknowledgment?: string;
  }) => {
    const { connectionId, organizationId, checkResultId, remediationKey, userId, acknowledgment } =
      payload;

    logger.info(`Single fix: ${remediationKey} on ${checkResultId} (user: ${userId})`);

    const progress: SingleFixProgress = { phase: 'executing' };
    sync(progress);

    try {
      const url = `${getCloudSecurityApiBaseUrl()}/v1/cloud-security/remediation/execute`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: makeServiceTokenHeaders({ organizationId, userId }),
        body: JSON.stringify({
          connectionId,
          checkResultId,
          remediationKey,
          acknowledgment,
        }),
      });

      const parsed = await parseApiResponse<unknown>(resp, url);

      if (!parsed.ok) {
        const errorMsg = parsed.error ?? `HTTP ${parsed.status}`;
        progress.phase = 'failed';
        progress.error = errorMsg;
        sync(progress);
        logger.error(`Single fix failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      const result = classifyExecuteResult(parsed.data);

      if (result.type === 'success') {
        progress.phase = 'success';
        progress.actionId = result.actionId;
        sync(progress);
        logger.info(`Single fix succeeded: ${result.actionId}`);
        return { success: true, actionId: result.actionId };
      }

      if (result.type === 'needs_permissions') {
        progress.phase = 'needs_permissions';
        progress.error = result.error;
        progress.permissionError = result.permissionError;
        sync(progress);
        logger.warn(
          `Single fix needs permissions: ${result.permissionError.missingActions.join(', ')}`,
        );
        return {
          success: false,
          needsPermissions: true,
          permissionError: result.permissionError,
        };
      }

      if (result.type === 'manual') {
        progress.phase = 'manual';
        progress.error = result.reason;
        progress.guidedSteps = result.guidedSteps;
        sync(progress);
        logger.info(
          `Single fix fell back to manual steps: ${result.guidedSteps.length} step(s)`,
        );
        return {
          success: false,
          manual: true,
          guidedSteps: result.guidedSteps,
          reason: result.reason,
        };
      }

      progress.phase = 'failed';
      progress.error = result.error;
      sync(progress);
      logger.error(`Single fix failed: ${result.error}`);
      return { success: false, error: result.error };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      progress.phase = 'failed';
      progress.error = errorMsg;
      sync(progress);
      logger.error(`Single fix exception: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  },
});
