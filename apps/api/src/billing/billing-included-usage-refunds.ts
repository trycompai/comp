import { Prisma, db } from '@db';
import type { BillingSkuKey } from '@trycompai/billing';
import { isUniqueConstraintError } from './billing-entitlements.types';

export async function refundIncludedUsageEvent(params: {
  organizationId: string;
  skuKey: BillingSkuKey;
  sourceResourceId: string;
  reason: string;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const consumeKey = [
    'consume',
    params.organizationId,
    params.skuKey,
    params.sourceResourceId,
  ].join(':');
  const refundKey = [
    'refund',
    params.organizationId,
    params.skuKey,
    params.sourceResourceId,
  ].join(':');

  try {
    const writeRefund = async (tx: Prisma.TransactionClient) => {
      const consumed = await tx.billingUsageEvent.findUnique({
        where: { idempotencyKey: consumeKey },
        select: {
          stripeSubscriptionItemId: true,
          periodStart: true,
          periodEnd: true,
        },
      });
      if (!consumed) return;

      await tx.billingUsageEvent.create({
        data: {
          organizationId: params.organizationId,
          skuKey: params.skuKey,
          eventType: 'refund',
          quantity: 1,
          sourceResourceId: params.sourceResourceId,
          idempotencyKey: refundKey,
          stripeSubscriptionItemId: consumed.stripeSubscriptionItemId,
          periodStart: consumed.periodStart,
          periodEnd: consumed.periodEnd,
        },
      });

      await tx.organizationBillingSubscription.updateMany({
        where: {
          organizationId: params.organizationId,
          skuKey: params.skuKey,
          usedQuantity: { gt: 0 },
        },
        data: { usedQuantity: { decrement: 1 } },
      });
    };

    if (params.tx) {
      await writeRefund(params.tx);
    } else {
      await db.$transaction(writeRefund);
    }
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
}
