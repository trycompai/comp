import { logger, metadata, task } from '@trigger.dev/sdk';

interface SingleFixProgress {
  phase: 'executing' | 'success' | 'failed' | 'needs_permissions';
  error?: string;
  actionId?: string;
  permissionError?: { missingActions: string[]; fixScript?: string };
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

function sync(progress: SingleFixProgress) {
  metadata.set('progress', JSON.parse(JSON.stringify(progress)));
}

interface ExecuteResult {
  actionId?: string;
  status: string;
  error?: string;
  permissionError?: { missingActions: string[]; fixScript?: string };
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
    const { connectionId, organizationId, checkResultId, remediationKey, userId, acknowledgment } = payload;

    logger.info(`Single fix: ${remediationKey} on ${checkResultId} (user: ${userId})`);

    const progress: SingleFixProgress = { phase: 'executing' };
    sync(progress);

    try {
      const url = `${getApiBaseUrl()}/v1/cloud-security/remediation/execute`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: makeHeaders(organizationId, userId),
        body: JSON.stringify({
          connectionId,
          checkResultId,
          remediationKey,
          acknowledgment,
        }),
      });

      const json = (await resp.json()) as ExecuteResult;

      if (!resp.ok) {
        const errorMsg = (json as { message?: string }).message ?? `HTTP ${resp.status}`;
        progress.phase = 'failed';
        progress.error = errorMsg;
        sync(progress);
        logger.error(`Single fix failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      if (json.status === 'success') {
        progress.phase = 'success';
        progress.actionId = json.actionId;
        sync(progress);
        logger.info(`Single fix succeeded: ${json.actionId}`);
        return { success: true, actionId: json.actionId };
      }

      if (json.permissionError) {
        progress.phase = 'needs_permissions';
        progress.error = json.error ?? 'Missing permissions';
        progress.permissionError = json.permissionError;
        sync(progress);
        logger.warn(`Single fix needs permissions: ${json.permissionError.missingActions.join(', ')}`);
        return { success: false, needsPermissions: true, permissionError: json.permissionError };
      }

      progress.phase = 'failed';
      progress.error = json.error ?? 'Remediation failed';
      sync(progress);
      logger.error(`Single fix failed: ${json.error}`);
      return { success: false, error: json.error };
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
