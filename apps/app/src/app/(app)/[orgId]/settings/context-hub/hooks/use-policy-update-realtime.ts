'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useMemo } from 'react';

export type PolicyUpdatePhase = 'analyzing' | 'updating' | 'completed';

export interface AffectedPolicyInfo {
  id: string;
  name: string;
}

export interface PolicyDiff {
  policyId: string;
  policyName: string;
  oldTextPreview: string;
  newTextPreview: string;
  sectionsModified: string[];
}

export interface PolicyUpdateStatus {
  phase: PolicyUpdatePhase;
  totalPolicies: number;
  analyzedCount: number;
  affectedCount: number;
  policiesTotal: number;
  policiesCompleted: number;
  affectedPoliciesInfo: AffectedPolicyInfo[];
  policiesStatus: Record<string, 'pending' | 'processing' | 'completed'>;
  policyDiffs: PolicyDiff[];
  isComplete: boolean;
  error: Error | null;
}

interface UsePolicyUpdateRealtimeOptions {
  runId: string | null;
  accessToken: string | null;
  enabled?: boolean;
}

export function usePolicyUpdateRealtime({
  runId,
  accessToken,
  enabled = true,
}: UsePolicyUpdateRealtimeOptions): PolicyUpdateStatus {
  const shouldSubscribe = enabled && !!runId && !!accessToken;

  const { run, error } = useRealtimeRun(shouldSubscribe ? runId! : '', {
    enabled: shouldSubscribe,
    accessToken: accessToken ?? undefined,
  });

  const status = useMemo<PolicyUpdateStatus>(() => {
    if (!run?.metadata) {
      return {
        phase: 'analyzing',
        totalPolicies: 0,
        analyzedCount: 0,
        affectedCount: 0,
        policiesTotal: 0,
        policiesCompleted: 0,
        affectedPoliciesInfo: [],
        policiesStatus: {},
        policyDiffs: [],
        isComplete: false,
        error: error ?? null,
      };
    }

    const meta = run.metadata as Record<string, unknown>;

    const affectedPoliciesInfo = (meta.affectedPoliciesInfo as AffectedPolicyInfo[]) || [];
    const policyDiffs = (meta.policyDiffs as PolicyDiff[]) || [];

    const policiesStatus: Record<string, 'pending' | 'processing' | 'completed'> = {};
    for (const policy of affectedPoliciesInfo) {
      const statusKey = `policy_${policy.id}_status`;
      policiesStatus[policy.id] =
        (meta[statusKey] as 'pending' | 'processing' | 'completed') || 'pending';
    }

    const phase = (meta.phase as PolicyUpdatePhase) || 'analyzing';
    const isComplete =
      run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELED';

    return {
      phase,
      totalPolicies: (meta.totalPolicies as number) || 0,
      analyzedCount: (meta.analyzedCount as number) || 0,
      affectedCount: (meta.affectedCount as number) || 0,
      policiesTotal: (meta.policiesTotal as number) || 0,
      policiesCompleted: (meta.policiesCompleted as number) || 0,
      affectedPoliciesInfo,
      policiesStatus,
      policyDiffs,
      isComplete,
      error: run.status === 'FAILED' ? new Error('Policy update failed') : (error ?? null),
    };
  }, [run?.metadata, run?.status, error]);

  return status;
}
