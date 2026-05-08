import { logger, metadata, task } from '@trigger.dev/sdk';

interface PreviewProgress {
  phase: 'analyzing' | 'complete' | 'failed';
  error?: string;
  preview?: Record<string, unknown>;
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

function sync(progress: PreviewProgress) {
  metadata.set('progress', JSON.parse(JSON.stringify(progress)));
}

export const remediatePreview = task({
  id: 'remediate-preview',
  maxDuration: 60 * 3, // 3 minutes
  retry: { maxAttempts: 1 },
  run: async (payload: {
    connectionId: string;
    organizationId: string;
    checkResultId: string;
    remediationKey: string;
    userId: string;
    cachedPermissions?: string[];
  }) => {
    const { connectionId, organizationId, checkResultId, remediationKey, userId, cachedPermissions } = payload;

    logger.info(`Preview: ${remediationKey} on ${checkResultId} (user: ${userId})`);

    const progress: PreviewProgress = { phase: 'analyzing' };
    sync(progress);

    try {
      const url = `${getApiBaseUrl()}/v1/cloud-security/remediation/preview`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: makeHeaders(organizationId, userId),
        body: JSON.stringify({
          connectionId,
          checkResultId,
          remediationKey,
          ...(cachedPermissions && { cachedPermissions }),
        }),
      });

      const json = await resp.json();

      if (!resp.ok) {
        const errorMsg = (json as { message?: string }).message ?? `HTTP ${resp.status}`;
        progress.phase = 'failed';
        progress.error = errorMsg;
        sync(progress);
        logger.error(`Preview failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      progress.phase = 'complete';
      progress.preview = json as Record<string, unknown>;
      sync(progress);
      logger.info(`Preview complete for ${remediationKey}`);
      return { success: true, preview: json };
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
