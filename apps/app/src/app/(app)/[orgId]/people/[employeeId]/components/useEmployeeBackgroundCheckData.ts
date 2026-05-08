'use client';

import { apiClient } from '@/lib/api-client';
import { getBillingSkuProductKey } from '@trycompai/billing';
import useSWR from 'swr';
import type { BackgroundCheckBillingStatus, BackgroundCheckRecord } from './backgroundCheckTypes';

export function useBackgroundCheckRecord({
  enabled = true,
  employeeId,
  initialBackgroundCheck,
  organizationId,
}: {
  enabled?: boolean;
  employeeId: string;
  initialBackgroundCheck: BackgroundCheckRecord | null;
  organizationId: string;
}) {
  return useSWR<BackgroundCheckRecord | null>(
    enabled ? [`/v1/people/${employeeId}/background-check`, organizationId] : null,
    async ([endpoint]) => {
      const response = await apiClient.get<BackgroundCheckRecord | null>(endpoint, organizationId);
      if (response.error) throw new Error('Failed to load background check');
      return response.data ?? null;
    },
    { fallbackData: initialBackgroundCheck },
  );
}

export function useBackgroundCheckBillingStatus({
  enabled = true,
  initialBillingStatus,
  organizationId,
}: {
  enabled?: boolean;
  initialBillingStatus: BackgroundCheckBillingStatus;
  organizationId: string;
}) {
  return useSWR<BackgroundCheckBillingStatus>(
    enabled ? ['/v1/background-check-billing/status', organizationId] : null,
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
  if (!billingStatus) return null;
  const subscription = (billingStatus.subscriptions ?? []).find(
    (item) =>
      getBillingSkuProductKey(item.skuKey) === 'background_check' &&
      (item.status === 'active' || item.status === 'trialing'),
  );
  // Wallet credits granted by platform admins. The backend's
  // `BillingEntitlementsService.tryConsumeIncludedUsageForProduct`
  // falls back to this wallet when no active subscription exists or
  // the subscription's included usage is exhausted, so we mirror that
  // logic here — otherwise the wizard paywalls users whose admin-
  // granted credits would actually be consumed by the create call.
  const walletBalance =
    (billingStatus.creditBalances ?? []).find(
      (entry) => entry.productKey === 'background_check',
    )?.balance ?? 0;
  if (!subscription) {
    // Returning `null` keeps the existing "no allowance — go pick a
    // plan" wizard path. We only have a positive allowance if there
    // are wallet credits to consume.
    return walletBalance > 0 ? walletBalance : null;
  }
  const subscriptionRemaining = Math.max(
    subscription.includedQuantity - subscription.usedQuantity,
    0,
  );
  return subscriptionRemaining + walletBalance;
}
