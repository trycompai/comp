'use server';

import { serverApi } from '@/lib/api-server';
import { classifyExecuteResult } from '@/trigger/tasks/cloud-security/execute-result';
import { classifyRetryPreview } from '@/trigger/tasks/cloud-security/retry-preview';
import { auth, runs, tasks } from '@trigger.dev/sdk';

interface BatchFixInput {
  organizationId: string;
  connectionId: string;
  findings: Array<{ id: string; key: string; title: string }>;
}

export async function startBatchFix(
  input: BatchFixInput,
): Promise<{ data?: { batchId: string; runId: string; accessToken: string }; error?: string }> {
  try {
    // Step 1: Create batch record in DB via API
    const api = serverApi;
    const batchResp = await api.post<{ data: { id: string } }>(
      '/v1/cloud-security/remediation/batch',
      {
        connectionId: input.connectionId,
        findings: input.findings,
      },
    );

    if (batchResp.error || !batchResp.data?.data?.id) {
      return { error: 'Failed to create batch record' };
    }

    const batchId = batchResp.data.data.id;

    // Step 2: Trigger the API-layer task
    const handle = await tasks.trigger('remediate-batch', {
      batchId,
      organizationId: input.organizationId,
      connectionId: input.connectionId,
    });

    // Step 3: Store triggerRunId on the batch
    await api.patch(`/v1/cloud-security/remediation/batch/${batchId}`, {
      triggerRunId: handle.id,
      status: 'running',
    });

    // Step 4: Create public access token for real-time progress
    const accessToken = await auth.createPublicToken({
      scopes: { read: { runs: [handle.id] } },
    });

    return { data: { batchId, runId: handle.id, accessToken } };
  } catch (err) {
    console.error('Failed to start batch fix:', err);
    return { error: err instanceof Error ? err.message : 'Failed to start batch fix' };
  }
}

export async function cancelBatchFix(runId: string, batchId: string): Promise<void> {
  try {
    // Mark batch as cancelled in DB — task will check this before next finding
    const api = serverApi;
    await api.patch(`/v1/cloud-security/remediation/batch/${batchId}`, {
      status: 'cancelled',
    });
    // Also cancel the trigger run
    await runs.cancel(runId);
  } catch {
    // Run may have already completed
  }
}

/** Check for an active batch on page load — returns batch + access token if found. */
export async function getActiveBatch(connectionId: string): Promise<{
  batchId: string;
  triggerRunId: string;
  accessToken: string;
  findings: Array<{ id: string; title: string; status: string; error?: string }>;
} | null> {
  try {
    const resp = await serverApi.get(
      `/v1/cloud-security/remediation/batch/active?connectionId=${connectionId}`,
    );
    const batch = (
      resp.data as { data?: { id: string; triggerRunId?: string; findings: unknown[] } }
    )?.data;
    if (!batch?.triggerRunId) return null;

    // Verify the trigger run is actually still active
    try {
      const run = await runs.retrieve(batch.triggerRunId);
      if (
        run.status === 'COMPLETED' ||
        run.status === 'FAILED' ||
        run.status === 'CANCELED' ||
        run.status === 'SYSTEM_FAILURE'
      ) {
        // Run is done — mark batch as done in DB so it doesn't show up again
        await serverApi.patch(`/v1/cloud-security/remediation/batch/${batch.id}`, {
          status: 'done',
        });
        return null;
      }
    } catch {
      // Can't verify run — mark batch as done to be safe
      await serverApi.patch(`/v1/cloud-security/remediation/batch/${batch.id}`, {
        status: 'done',
      });
      return null;
    }

    const accessToken = await auth.createPublicToken({
      scopes: { read: { runs: [batch.triggerRunId] } },
    });

    return {
      batchId: batch.id,
      triggerRunId: batch.triggerRunId,
      accessToken,
      findings: batch.findings as Array<{
        id: string;
        title: string;
        status: string;
        error?: string;
      }>,
    };
  } catch {
    return null;
  }
}

export async function skipBatchFinding(batchId: string, findingId: string): Promise<void> {
  try {
    await serverApi.post(`/v1/cloud-security/remediation/batch/${batchId}/skip/${findingId}`, {});
  } catch {
    // Best effort
  }
}

/** Retry a single finding immediately (user added permissions and wants instant retry). */
export async function retryFinding(
  connectionId: string,
  checkResultId: string,
  remediationKey: string,
): Promise<{
  status: 'fixed' | 'failed' | 'needs_permissions';
  error?: string;
  missingPermissions?: string[];
}> {
  try {
    // Preview first
    const preview = await serverApi.post<{
      guidedOnly?: boolean;
      missingPermissions?: string[];
    }>('/v1/cloud-security/remediation/preview', {
      connectionId,
      checkResultId,
      remediationKey,
    });

    if (preview.error) return { status: 'failed', error: String(preview.error) };

    const data = preview.data as
      | { guidedOnly?: boolean; missingPermissions?: string[] }
      | undefined;
    const previewDecision = classifyRetryPreview(data);
    if (previewDecision.type === 'needs_permissions') {
      return {
        status: 'needs_permissions',
        missingPermissions: previewDecision.missingPermissions,
      };
    }
    if (previewDecision.type === 'manual') {
      return { status: 'failed', error: previewDecision.error };
    }

    // Execute
    const execute = await serverApi.post<unknown>('/v1/cloud-security/remediation/execute', {
      connectionId,
      checkResultId,
      remediationKey,
      acknowledgment: 'acknowledged',
    });

    if (execute.error) {
      return { status: 'failed', error: String(execute.error) };
    }

    const result = classifyExecuteResult(execute.data);
    if (result.type === 'success') return { status: 'fixed' };
    if (result.type === 'needs_permissions') {
      return {
        status: 'needs_permissions',
        error: result.error,
        missingPermissions: result.permissionError.missingActions,
      };
    }

    return { status: 'failed', error: result.error };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : 'Failed' };
  }
}
