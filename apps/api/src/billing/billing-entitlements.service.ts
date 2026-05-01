import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, db } from '@db';
import {
  getBillingSkuKeysForProduct,
  type BillingProductKey,
  type BillingSkuKey,
} from '@trycompai/billing';
import { BillingCreditsService } from './billing-credits.service';
import { refundIncludedUsageEvent } from './billing-included-usage-refunds';
import {
  type BillingConsumeResult,
  isAccessStatus,
  isUniqueConstraintError,
  sameTime,
  type SyncSubscriptionItemParams,
  type WriteBillingAuditEventParams,
} from './billing-entitlements.types';

@Injectable()
export class BillingEntitlementsService {
  constructor(private readonly credits?: BillingCreditsService) {}

  async tryConsumeIncludedUsageForProduct(params: {
    organizationId: string;
    productKey: BillingProductKey;
    sourceResourceId: string;
  }): Promise<BillingConsumeResult> {
    const skuKeys = getBillingSkuKeysForProduct(params.productKey);
    const subscriptions = await db.organizationBillingSubscription.findMany({
      where: {
        organizationId: params.organizationId,
        skuKey: { in: skuKeys },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const activeSubscription = subscriptions.find(
      (subscription) =>
        isAccessStatus(subscription.stripeStatus) &&
        (!subscription.currentPeriodEnd ||
          subscription.currentPeriodEnd.getTime() > Date.now()),
    );
    if (!activeSubscription) {
      return this.tryConsumeCreditFallback({
        ...params,
        fallbackStatus: 'not_configured',
      });
    }

    if (
      activeSubscription.usedQuantity >= activeSubscription.includedQuantity
    ) {
      const creditResult = await this.tryConsumeCreditFallback({
        ...params,
        fallbackStatus: 'exhausted',
      });
      return creditResult.status === 'consumed'
        ? creditResult
        : { status: 'exhausted', subscriptionId: activeSubscription.id };
    }

    return this.tryConsumeIncludedUsage({
      organizationId: params.organizationId,
      skuKey: activeSubscription.skuKey as BillingSkuKey,
      sourceResourceId: params.sourceResourceId,
    });
  }

  async tryConsumeIncludedUsage(params: {
    organizationId: string;
    skuKey: BillingSkuKey;
    sourceResourceId: string;
  }): Promise<BillingConsumeResult> {
    const subscription = await db.organizationBillingSubscription.findUnique({
      where: {
        organizationId_skuKey: {
          organizationId: params.organizationId,
          skuKey: params.skuKey,
        },
      },
    });

    if (!subscription || !isAccessStatus(subscription.stripeStatus)) {
      return { status: 'not_configured' };
    }

    if (
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd.getTime() <= Date.now()
    ) {
      return { status: 'not_configured' };
    }

    if (subscription.usedQuantity >= subscription.includedQuantity) {
      return { status: 'exhausted', subscriptionId: subscription.id };
    }

    const idempotencyKey = [
      'consume',
      params.organizationId,
      params.skuKey,
      params.sourceResourceId,
    ].join(':');

    try {
      await db.$transaction(async (tx) => {
        await tx.billingUsageEvent.create({
          data: {
            organizationId: params.organizationId,
            skuKey: params.skuKey,
            eventType: 'consume',
            quantity: 1,
            sourceResourceId: params.sourceResourceId,
            idempotencyKey,
            stripeSubscriptionItemId: subscription.stripeSubscriptionItemId,
            periodStart: subscription.currentPeriodStart,
            periodEnd: subscription.currentPeriodEnd,
          },
        });

        const updated = await tx.organizationBillingSubscription.updateMany({
          where: {
            id: subscription.id,
            usedQuantity: { lt: subscription.includedQuantity },
          },
          data: { usedQuantity: { increment: 1 } },
        });

        if (updated.count === 0) {
          throw new HttpException(
            'Subscription allowance has been exhausted.',
            HttpStatus.PAYMENT_REQUIRED,
          );
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { status: 'consumed', subscriptionId: subscription.id };
      }
      throw error;
    }

    return { status: 'consumed', subscriptionId: subscription.id };
  }

  async syncSubscriptionItem(
    params: SyncSubscriptionItemParams,
  ): Promise<void> {
    const existing = await db.organizationBillingSubscription.findUnique({
      where: {
        organizationId_skuKey: {
          organizationId: params.organizationId,
          skuKey: params.skuKey,
        },
      },
      select: {
        stripeSubscriptionItemId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    });
    if (
      existing?.currentPeriodStart &&
      params.currentPeriodStart &&
      existing.currentPeriodStart.getTime() >
        params.currentPeriodStart.getTime()
    ) {
      return;
    }

    const resetUsage =
      !existing ||
      !sameTime(existing.currentPeriodStart, params.currentPeriodStart);

    await db.$transaction(async (tx) => {
      await tx.organizationBillingSubscription.upsert({
        where: {
          organizationId_skuKey: {
            organizationId: params.organizationId,
            skuKey: params.skuKey,
          },
        },
        create: {
          organizationId: params.organizationId,
          skuKey: params.skuKey,
          stripeSubscriptionId: params.stripeSubscriptionId,
          stripeSubscriptionItemId: params.stripeSubscriptionItemId,
          stripePriceId: params.stripePriceId,
          stripeStatus: params.stripeStatus,
          currentPeriodStart: params.currentPeriodStart,
          currentPeriodEnd: params.currentPeriodEnd,
          includedQuantity: params.includedQuantity,
          cancelAtPeriodEnd: params.cancelAtPeriodEnd,
          canceledAt: params.canceledAt,
        },
        update: {
          stripeSubscriptionId: params.stripeSubscriptionId,
          stripeSubscriptionItemId: params.stripeSubscriptionItemId,
          stripePriceId: params.stripePriceId,
          stripeStatus: params.stripeStatus,
          currentPeriodStart: params.currentPeriodStart,
          currentPeriodEnd: params.currentPeriodEnd,
          includedQuantity: params.includedQuantity,
          ...(resetUsage ? { usedQuantity: 0 } : {}),
          cancelAtPeriodEnd: params.cancelAtPeriodEnd,
          canceledAt: params.canceledAt,
        },
      });

      if (resetUsage) {
        const idempotencyKey = [
          'grant',
          params.organizationId,
          params.skuKey,
          params.stripeSubscriptionItemId,
          params.currentPeriodStart?.toISOString() ?? 'none',
          params.currentPeriodEnd?.toISOString() ?? 'none',
          params.stripeEventId ?? 'manual',
        ].join(':');
        await tx.billingUsageEvent.create({
          data: {
            organizationId: params.organizationId,
            skuKey: params.skuKey,
            eventType: 'grant',
            quantity: params.includedQuantity,
            idempotencyKey,
            stripeEventId: params.stripeEventId,
            stripeSubscriptionItemId: params.stripeSubscriptionItemId,
            periodStart: params.currentPeriodStart,
            periodEnd: params.currentPeriodEnd,
          },
        });
      }
    });

    await this.writeAuditEvent({
      organizationId: params.organizationId,
      eventType: 'subscription_synced',
      skuKey: params.skuKey,
      stripeEventId: params.stripeEventId,
      metadata: {
        stripeSubscriptionId: params.stripeSubscriptionId,
        stripeSubscriptionItemId: params.stripeSubscriptionItemId,
        stripeStatus: params.stripeStatus,
      },
    });
  }

  async recordOneTimeUsage(params: {
    organizationId: string;
    skuKey: BillingSkuKey;
    sourceResourceId: string;
    stripeInvoiceId?: string;
  }): Promise<void> {
    const idempotencyKey = [
      'one-time',
      params.organizationId,
      params.skuKey,
      params.sourceResourceId,
    ].join(':');

    try {
      await db.billingUsageEvent.create({
        data: {
          organizationId: params.organizationId,
          skuKey: params.skuKey,
          eventType: 'one_time',
          quantity: 1,
          sourceResourceId: params.sourceResourceId,
          idempotencyKey,
          stripeInvoiceId: params.stripeInvoiceId,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  async refundIncludedUsage(params: {
    organizationId: string;
    skuKey: BillingSkuKey;
    sourceResourceId: string;
    reason: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    await refundIncludedUsageEvent(params);
  }

  async refundIncludedUsageForProduct(params: {
    organizationId: string;
    productKey: BillingProductKey;
    sourceResourceId: string;
    reason: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const skuKeys = getBillingSkuKeysForProduct(params.productKey);
    const client = params.tx ?? db;
    const consumed = await client.billingUsageEvent.findFirst({
      where: {
        organizationId: params.organizationId,
        skuKey: { in: skuKeys },
        eventType: 'consume',
        sourceResourceId: params.sourceResourceId,
      },
      orderBy: { createdAt: 'desc' },
      select: { skuKey: true },
    });
    if (!consumed) {
      if (params.tx || !this.credits) return;
      await this.credits.refundForProduct({
        organizationId: params.organizationId,
        productKey: params.productKey,
        sourceResourceId: params.sourceResourceId,
        reason: params.reason,
      });
      return;
    }
    await refundIncludedUsageEvent({
      organizationId: params.organizationId,
      skuKey: consumed.skuKey as BillingSkuKey,
      sourceResourceId: params.sourceResourceId,
      reason: params.reason,
      tx: params.tx,
    });
  }

  private async tryConsumeCreditFallback(params: {
    organizationId: string;
    productKey: BillingProductKey;
    sourceResourceId: string;
    fallbackStatus: 'not_configured' | 'exhausted';
  }): Promise<BillingConsumeResult> {
    if (!this.credits) {
      return params.fallbackStatus === 'exhausted'
        ? { status: 'exhausted', subscriptionId: 'manual_credit' }
        : { status: 'not_configured' };
    }
    const creditResult = await this.credits.tryConsumeForProduct({
      organizationId: params.organizationId,
      productKey: params.productKey,
      sourceResourceId: params.sourceResourceId,
    });
    return creditResult.status === 'consumed'
      ? { status: 'consumed', subscriptionId: 'manual_credit' }
      : params.fallbackStatus === 'exhausted'
        ? { status: 'exhausted', subscriptionId: 'manual_credit' }
        : { status: 'not_configured' };
  }

  async writeAuditEvent(params: WriteBillingAuditEventParams): Promise<void> {
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
}
