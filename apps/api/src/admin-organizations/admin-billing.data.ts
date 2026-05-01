import { NotFoundException } from '@nestjs/common';
import { db, Prisma } from '@db';
import type { BillingSkuKey } from '@trycompai/billing';
import type Stripe from 'stripe';
import { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import { StripeService } from '../stripe/stripe.service';
import { dateFromSeconds, readNumber } from './admin-billing.helpers';

export async function getOrgBillingContext(organizationId: string) {
  const [organization, billing, subscriptions] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    }),
    db.organizationBilling.findUnique({ where: { organizationId } }),
    db.organizationBillingSubscription.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    }),
  ]);
  if (!organization) {
    throw new NotFoundException(`Organization ${organizationId} not found`);
  }
  return { organization, billing, subscriptions };
}

export async function writeBillingAudit(params: {
  organizationId: string;
  eventType: string;
  skuKey?: string | null;
  stripeEventId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await db.billingAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      eventType: params.eventType,
      skuKey: params.skuKey,
      stripeEventId: params.stripeEventId,
      metadata: params.metadata,
    },
  });
}

export async function createAdminSubscription(params: {
  organizationId: string;
  stripeCustomerId: string;
  skuKey: BillingSkuKey;
  stripePriceId: string;
  includedQuantity: number;
  stripeService: StripeService;
  entitlements: BillingEntitlementsService;
}) {
  const subscription = await params.stripeService
    .getClient()
    .subscriptions.create(
      {
        customer: params.stripeCustomerId,
        items: [{ price: params.stripePriceId, quantity: 1 }],
        metadata: {
          organizationId: params.organizationId,
          skuKey: params.skuKey,
          source: 'admin-billing',
        },
        expand: ['items.data.price'],
      },
      {
        idempotencyKey: [
          'admin-subscription-create',
          params.organizationId,
          params.skuKey,
        ].join(':'),
      },
    );
  const item = subscription.items.data[0];
  if (!item) throw new NotFoundException('Stripe subscription item not found.');
  await syncStripeSubscriptionItem({
    organizationId: params.organizationId,
    skuKey: params.skuKey,
    stripePriceId: params.stripePriceId,
    includedQuantity: params.includedQuantity,
    subscription,
    item,
    entitlements: params.entitlements,
  });
}

export async function syncStripeSubscriptionItem(params: {
  organizationId: string;
  skuKey: BillingSkuKey;
  stripePriceId: string;
  includedQuantity: number;
  subscription: Stripe.Subscription;
  item: Stripe.SubscriptionItem;
  entitlements: BillingEntitlementsService;
}) {
  await params.entitlements.syncSubscriptionItem({
    organizationId: params.organizationId,
    skuKey: params.skuKey,
    stripeSubscriptionId: params.subscription.id,
    stripeSubscriptionItemId: params.item.id,
    stripePriceId: params.stripePriceId,
    stripeStatus: params.subscription.status,
    currentPeriodStart: dateFromSeconds(
      readNumber(params.item, 'current_period_start'),
    ),
    currentPeriodEnd: dateFromSeconds(
      readNumber(params.item, 'current_period_end'),
    ),
    includedQuantity: params.includedQuantity,
    cancelAtPeriodEnd: params.subscription.cancel_at_period_end,
    canceledAt: dateFromSeconds(params.subscription.canceled_at),
    stripeEventId: undefined,
  });
}
