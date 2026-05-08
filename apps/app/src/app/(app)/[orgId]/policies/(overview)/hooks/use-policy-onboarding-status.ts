'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useMemo } from 'react';
import type { PolicyTailoringStatus } from '../../all/components/policy-tailoring-context';

export interface PolicyOnboardingItemInfo {
  id: string;
  name: string;
}

/**
 * Subscribe to the onboarding trigger.dev run and derive per-policy tailoring
 * status plus overall progress. Mirrors use-onboarding-status in risk/ and
 * vendors/ but handles the `policies` → `policy_<id>_status` singular
 * conversion correctly (the shared hook's `itemType.slice(0, -1)` would
 * produce `policie_`).
 */
export function usePolicyOnboardingStatus(
  onboardingRunId: string | null | undefined,
) {
  const shouldSubscribe = Boolean(onboardingRunId);
  const { run } = useRealtimeRun(shouldSubscribe ? onboardingRunId! : '', {
    enabled: shouldSubscribe,
  });

  const itemStatuses = useMemo<Record<string, PolicyTailoringStatus>>(() => {
    if (!run?.metadata) return {};

    const meta = run.metadata as Record<string, unknown>;
    const itemsInfo =
      (meta.policiesInfo as Array<{ id: string; name: string }>) || [];

    return itemsInfo.reduce<Record<string, PolicyTailoringStatus>>(
      (acc, item) => {
        const status = meta[`policy_${item.id}_status`];
        if (
          status === 'queued' ||
          status === 'pending' ||
          status === 'processing' ||
          status === 'completed'
        ) {
          acc[item.id] = status;
        }
        return acc;
      },
      {},
    );
  }, [run?.metadata]);

  const progress = useMemo(() => {
    if (!run?.metadata) return null;

    const meta = run.metadata as Record<string, unknown>;
    const total = typeof meta.policiesTotal === 'number' ? meta.policiesTotal : 0;
    const completed =
      typeof meta.policiesCompleted === 'number' ? meta.policiesCompleted : 0;

    if (total === 0) return null;
    return { total, completed };
  }, [run?.metadata]);

  const itemsInfo = useMemo<PolicyOnboardingItemInfo[]>(() => {
    if (!run?.metadata) return [];
    const meta = run.metadata as Record<string, unknown>;
    return (meta.policiesInfo as Array<{ id: string; name: string }>) || [];
  }, [run?.metadata]);

  // Active if any item is not yet completed
  const hasActiveItems = useMemo(
    () =>
      Object.values(itemStatuses).some(
        (status) => status !== 'completed' && status !== undefined,
      ),
    [itemStatuses],
  );

  const isRunActive = useMemo(() => {
    if (!run) return false;
    return ['EXECUTING', 'QUEUED', 'WAITING'].includes(run.status);
  }, [run]);

  const hasActiveProgress =
    progress !== null && progress.completed < progress.total;
  const isActive = isRunActive || hasActiveProgress || hasActiveItems;

  return {
    itemStatuses,
    progress,
    itemsInfo,
    isActive,
    isLoading: shouldSubscribe && !run,
    runStatus: run?.status,
  };
}
