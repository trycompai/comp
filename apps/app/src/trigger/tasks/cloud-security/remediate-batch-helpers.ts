import { db } from '@db/server';
import { metadata } from '@trigger.dev/sdk';
import { postCloudSecurityApi } from './api-response';
import { classifyExecuteResult } from './execute-result';

export type FindingStatus =
  | 'pending'
  | 'fixing'
  | 'fixed'
  | 'skipped'
  | 'failed'
  | 'cancelled'
  | 'needs_permissions';

export interface FindingProgress {
  id: string;
  key: string;
  title: string;
  status: FindingStatus;
  error?: string;
  /** Per-finding missing permissions (only for needs_permissions status) */
  missingPermissions?: string[];
}

export interface BatchProgress {
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

interface PreviewResult {
  guidedOnly?: boolean;
  missingPermissions?: string[];
}

async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  organizationId: string,
  userId?: string,
): Promise<{ data?: T; error?: string }> {
  return postCloudSecurityApi<T>({ path, body, organizationId, userId });
}

export function sync(progress: BatchProgress) {
  metadata.set('progress', JSON.parse(JSON.stringify(progress)));
}

export async function tryFix(
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
  if (preview.data?.guidedOnly) {
    return { status: 'skipped', error: 'Requires manual fix' };
  }

  if (preview.data?.missingPermissions && preview.data.missingPermissions.length > 0) {
    return {
      status: 'needs_permissions',
      missingPerms: preview.data.missingPermissions,
    };
  }

  const execute = await apiPost<unknown>(
    '/v1/cloud-security/remediation/execute',
    {
      connectionId,
      checkResultId: finding.id,
      remediationKey: finding.key,
      acknowledgment: 'acknowledged',
    },
    organizationId,
    userId,
  );

  if (execute.error) {
    return {
      status: 'failed',
      error: execute.error,
    };
  }

  const result = classifyExecuteResult(execute.data);
  if (result.type === 'success') return { status: 'fixed' };
  if (result.type === 'needs_permissions') {
    return {
      status: 'needs_permissions',
      error: result.error,
      missingPerms: result.permissionError.missingActions,
    };
  }

  return { status: 'failed', error: result.error };
}

export async function isCancelled(batchId: string): Promise<boolean> {
  const b = await db.remediationBatch.findUnique({
    where: { id: batchId },
    select: { status: true },
  });
  return !b || b.status === 'cancelled';
}

export async function isFindingCancelled(batchId: string, findingId: string): Promise<boolean> {
  const b = await db.remediationBatch.findUnique({
    where: { id: batchId },
    select: { findings: true },
  });
  if (!b) return true;
  const findings = b.findings as unknown as FindingProgress[];
  return findings.find((f) => f.id === findingId)?.status === 'cancelled';
}

export async function persistProgress(batchId: string, progress: BatchProgress) {
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
