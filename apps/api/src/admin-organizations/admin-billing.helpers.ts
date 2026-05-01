import {
  getBillingCatalog,
  getBillingSku,
  getBillingSkuProductKey,
  type BillingProductKey,
  type BillingSkuKey,
} from '@trycompai/billing';
import type Stripe from 'stripe';
import type {
  AdminBillingPlan,
  AdminBillingSubscription,
} from './admin-billing.types';

export function listAdminBillingPlans(): AdminBillingPlan[] {
  return Object.values(getBillingCatalog().skus)
    .filter((sku) => sku.cadence === 'month' && !sku.deprecated)
    .map((sku) => ({
      skuKey: sku.key,
      productKey: sku.productKey,
      name: sku.name,
      unitAmount: sku.unitAmount,
      currency: sku.currency,
      includedQuantity: sku.includedUsage?.quantity ?? 0,
    }));
}

export function mapAdminSubscription(subscription: {
  id: string;
  skuKey: string;
  stripeSubscriptionId: string;
  stripeSubscriptionItemId: string;
  stripeStatus: string;
  includedQuantity: number;
  usedQuantity: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}): AdminBillingSubscription {
  return {
    id: subscription.id,
    skuKey: subscription.skuKey,
    productKey: getBillingSkuProductKey(subscription.skuKey),
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    stripeSubscriptionItemId: subscription.stripeSubscriptionItemId,
    stripeStatus: subscription.stripeStatus,
    includedQuantity: subscription.includedQuantity,
    usedQuantity: subscription.usedQuantity,
    remainingQuantity: Math.max(
      subscription.includedQuantity - subscription.usedQuantity,
      0,
    ),
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
  };
}

export function getProductFromSku(skuKey: BillingSkuKey): BillingProductKey {
  return getBillingSku({ skuKey }).productKey;
}

export function isDowngrade(params: {
  currentIncludedQuantity: number;
  nextSkuKey: BillingSkuKey;
}) {
  const nextSku = getBillingSku({ skuKey: params.nextSkuKey });
  return (
    (nextSku.includedUsage?.quantity ?? 0) < params.currentIncludedQuantity
  );
}

export function dateFromSeconds(value: number | null | undefined): Date | null {
  return typeof value === 'number' ? new Date(value * 1000) : null;
}

export function readNumber(value: unknown, key: string): number | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === 'number' ? raw : null;
}

export function extractStripeId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return null;
  const raw = (value as Record<string, unknown>).id;
  return typeof raw === 'string' ? raw : null;
}

export function getInvoiceCustomerId(invoice: Stripe.Invoice): string | null {
  return extractStripeId(invoice.customer);
}
