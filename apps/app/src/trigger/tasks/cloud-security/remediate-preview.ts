import { logger, metadata, task } from '@trigger.dev/sdk';
import {
  getCloudSecurityApiBaseUrl,
  makeServiceTokenHeaders,
  parseApiResponse,
} from './api-response';

interface PreviewProgress {
  phase: 'analyzing' | 'complete' | 'failed';
  error?: string;
  preview?: Record<string, unknown>;
}

function sync(progress: PreviewProgress) {
  metadata.set('progress', JSON.parse(JSON.stringify(progress)));
}

export const remediatePreview = task({
  id: 'remediate-preview',
  maxDuration: 60 * 10, // 10 minutes
  retry: { maxAttempts: 1 },
  run: async (payload: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
    userId: string;
    cachedPermissions?: string[];
  }) => {
    const {
      connectionId,
      organizationId,
      checkResultId,
      remediationKey,
      userId,
      cachedPermissions,
    } = payload;

    logger.info(`Preview: ${remediationKey} on ${checkResultId} (user: ${userId})`);

    const progress: PreviewProgress = { phase: 'analyzing' };
    sync(progress);

    try {
      const url = `${getCloudSecurityApiBaseUrl()}/v1/cloud-security/remediation/preview`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: makeServiceTokenHeaders({ organizationId, userId }),
        body: JSON.stringify({
          connectionId,
          checkResultId,
          remediationKey,
          ...(cachedPermissions && { cachedPermissions }),
        }),
      });

      const parsed = await parseApiResponse<Record<string, unknown>>(resp, url);

      if (!parsed.ok) {
        const errorMsg = parsed.error ?? `HTTP ${parsed.status}`;
        progress.phase = 'failed';
        progress.error = errorMsg;
        sync(progress);
        logger.error(`Preview failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      progress.phase = 'complete';
      progress.preview = parsed.data;
      sync(progress);
      logger.info(`Preview complete for ${remediationKey}`);
      return { success: true, preview: parsed.data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      progress.phase = 'failed';
      progress.error = errorMsg;
      sync(progress);
      logger.error(`Preview exception: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  },
});
