'use client';

import { apiClient } from '@/lib/api-client';
import { getBillingSkuProductKey } from '@trycompai/billing';
import useSWR from 'swr';
import type { BackgroundCheckBillingStatus, BackgroundCheckRecord } from './backgroundCheckTypes';

export function useBackgroundCheckRecord({
  employeeId,
  initialBackgroundCheck,
  organizationId,
}: {
  employeeId: string;
  initialBackgroundCheck: BackgroundCheckRecord | null;
  organizationId: string;
}) {
  return useSWR<BackgroundCheckRecord | null>(
    [`/v1/people/${employeeId}/background-check`, organizationId],
    async ([endpoint]) => {
      const response = await apiClient.get<BackgroundCheckRecord | null>(endpoint, organizationId);
      if (response.error) throw new Error('Failed to load background check');
      return response.data ?? null;
    },
    { fallbackData: initialBackgroundCheck },
  );
}

export function useBackgroundCheckBillingStatus({
  initialBillingStatus,
  organizationId,
}: {
  initialBillingStatus: BackgroundCheckBillingStatus;
  organizationId: string;
}) {
  return useSWR<BackgroundCheckBillingStatus>(
    ['/v1/background-check-billing/status', organizationId],
    async ([endpoint]) => {
      const response = await apiClient.get<BackgroundCheckBillingStatus>(endpoint, organizationId);
      if (response.error || !response.data) {
        throw new Error('Failed to load billing status');
      }
      return response.data;
    },
    { fallbackData: initialBillingStatus },
  );
}

export function getBackgroundChecksRemaining({
  billingStatus,
}: {
  billingStatus: BackgroundCheckBillingStatus | undefined;
}): number | null {
  const subscription = (billingStatus?.subscriptions ?? []).find(
    (item) =>
      getBillingSkuProductKey(item.skuKey) === 'background_check' &&
      (item.status === 'active' || item.status === 'trialing'),
  );
  if (!subscription) return null;
  return Math.max(subscription.includedQuantity - subscription.usedQuantity, 0);
}
