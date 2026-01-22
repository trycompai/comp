'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { useMemo } from 'react';

export type OnboardingItemStatus = 'pending' | 'processing' | 'created' | 'assessing' | 'completed';

export interface OnboardingItemInfo {
  id: string;
  name: string;
}

export function useOnboardingStatus(
  onboardingRunId: string | null | undefined,
  itemType: 'risks' | 'vendors',
) {
  const shouldSubscribe = Boolean(onboardingRunId);
  const { run } = useRealtimeRun(shouldSubscribe ? onboardingRunId! : '', {
    enabled: shouldSubscribe,
  });

  const itemStatuses = useMemo<Record<string, OnboardingItemStatus>>(() => {
    if (!run?.metadata) {
      return {};
    }

    const meta = run.metadata as Record<string, unknown>;
    const itemsInfo = (meta[`${itemType}Info`] as Array<{ id: string; name: string }>) || [];

    return itemsInfo.reduce<Record<string, OnboardingItemStatus>>((acc, item) => {
      const statusKey = `${itemType.slice(0, -1)}_${item.id}_status`;
      const status = meta[statusKey];

      if (
        status === 'pending' ||
        status === 'processing' ||
        status === 'created' ||
        status === 'assessing' ||
        status === 'completed'
      ) {
        acc[item.id] = status;
      }
      return acc;
    }, {});
  }, [run?.metadata, itemType]);

  const progress = useMemo(() => {
    if (!run?.metadata) return null;

    const meta = run.metadata as Record<string, unknown>;
    const total =
      typeof meta[`${itemType}Total`] === 'number' ? (meta[`${itemType}Total`] as number) : 0;
    const completed =
      typeof meta[`${itemType}Completed`] === 'number'
        ? (meta[`${itemType}Completed`] as number)
        : 0;

    if (total === 0) {
      return null;
    }

    return { total, completed };
  }, [run?.metadata, itemType]);

  const itemsInfo = useMemo<OnboardingItemInfo[]>(() => {
    if (!run?.metadata) {
      return [];
    }

    const meta = run.metadata as Record<string, unknown>;
    return (meta[`${itemType}Info`] as Array<{ id: string; name: string }>) || [];
  }, [run?.metadata, itemType]);

  // Check if any items are still being processed (not completed)
  const hasActiveItems = useMemo(() => {
    return Object.values(itemStatuses).some(
      (status) => status !== 'completed' && status !== undefined,
    );
  }, [itemStatuses]);

  // Check if onboarding run is active based on run status
  const isRunActive = useMemo(() => {
    if (!run) return false;
    // Run is active if it's executing, queued, or waiting
    const activeStatuses = ['EXECUTING', 'QUEUED', 'WAITING'];
    return activeStatuses.includes(run.status);
  }, [run]);

  // Check if items are still being processed
  const hasActiveProgress = progress !== null && progress.completed < progress.total;

  // Onboarding is active if:
  // 1. Run is active (executing/queued), OR
  // 2. There's active progress, OR
  // 3. There are active items being processed
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
