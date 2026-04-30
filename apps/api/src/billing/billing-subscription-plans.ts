import { db } from '@db';
import {
  type BillingProductKey,
  type BillingSkuKey,
  getBillingSkuProductKey,
} from '@trycompai/billing';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { StripeService } from '../stripe/stripe.service';

export async function findActiveProductSubscription(params: {
  organizationId: string;
  productKey: BillingProductKey;
}) {
  const subscriptions = await findProductSubscriptions(params);
  return (
    subscriptions.find((subscription) => {
      return (
        subscription.stripeStatus === 'active' ||
        subscription.stripeStatus === 'trialing'
      );
    }) ?? null
  );
}

export async function findProductSubscriptions(params: {
  organizationId: string;
  productKey: BillingProductKey;
}) {
  const subscriptions = await db.organizationBillingSubscription.findMany({
    where: { organizationId: params.organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return subscriptions.filter(
    (subscription) =>
      getBillingSkuProductKey(subscription.skuKey) === params.productKey,
  );
}

export async function changeSubscriptionPlan(params: {
  organizationId: string;
  subscription: {
    id: string;
    skuKey: string;
    stripeSubscriptionId: string;
    stripeSubscriptionItemId: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
  };
  skuKey: BillingSkuKey;
  stripePriceId: string;
  includedQuantity: number;
  stripeService: StripeService;
  entitlements: BillingEntitlementsService;
}): Promise<{ changed: true }> {
  const stripe = params.stripeService.getClient();
  const updatedSubscription = await stripe.subscriptions.update(
    params.subscription.stripeSubscriptionId,
    {
      items: [
        {
          id: params.subscription.stripeSubscriptionItemId,
          price: params.stripePriceId,
        },
      ],
      metadata: {
        organizationId: params.organizationId,
        skuKey: params.skuKey,
        source: 'comp-billing-subscription',
      },
    },
    {
      idempotencyKey: [
        'subscription-plan-change',
        params.organizationId,
        params.subscription.stripeSubscriptionItemId,
        params.skuKey,
      ].join(':'),
    },
  );

  const updatedItem =
    updatedSubscription.items.data.find(
      (item) => item.id === params.subscription.stripeSubscriptionItemId,
    ) ?? updatedSubscription.items.data[0];

  const currentPeriodStart =
    dateFromSeconds(readNumber(updatedItem, 'current_period_start')) ??
    params.subscription.currentPeriodStart;
  const currentPeriodEnd =
    dateFromSeconds(readNumber(updatedItem, 'current_period_end')) ??
    params.subscription.currentPeriodEnd;

  await db.organizationBillingSubscription.update({
    where: { id: params.subscription.id },
    data: {
      skuKey: params.skuKey,
      stripeSubscriptionId: updatedSubscription.id,
      stripeSubscriptionItemId:
        updatedItem?.id ?? params.subscription.stripeSubscriptionItemId,
      stripePriceId: params.stripePriceId,
      stripeStatus: updatedSubscription.status,
      currentPeriodStart,
      currentPeriodEnd,
      includedQuantity: params.includedQuantity,
      cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      canceledAt: dateFromSeconds(updatedSubscription.canceled_at),
    },
  });

  await params.entitlements.writeAuditEvent({
    organizationId: params.organizationId,
    eventType: 'subscription_plan_changed',
    skuKey: params.skuKey,
    metadata: {
      stripeSubscriptionId: updatedSubscription.id,
      stripeSubscriptionItemId:
        updatedItem?.id ?? params.subscription.stripeSubscriptionItemId,
      previousSkuKey: params.subscription.skuKey,
    },
  });

  return { changed: true };
}

function dateFromSeconds(value: number | null): Date | null {
  return value === null ? null : new Date(value * 1000);
}

function readNumber(value: unknown, key: string): number | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === 'number' ? raw : null;
}
