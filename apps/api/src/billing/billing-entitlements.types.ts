import { Prisma } from '@db';
import type { BillingSkuKey } from '@trycompai/billing';

export type BillingConsumeResult =
  | { status: 'consumed'; subscriptionId: string }
  | { status: 'exhausted'; subscriptionId: string }
  | { status: 'not_configured' };

export type SyncSubscriptionItemParams = {
  organizationId: string;
  skuKey: BillingSkuKey;
  stripeSubscriptionId: string;
  stripeSubscriptionItemId: string;
  stripePriceId: string;
  stripeStatus: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  includedQuantity: number;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  stripeEventId?: string;
};

export type WriteBillingAuditEventParams = {
  organizationId: string;
  eventType: string;
  skuKey?: string;
  stripeEventId?: string;
  metadata?: Prisma.InputJsonValue;
};

export function isAccessStatus(status: string): boolean {
  return status === 'active' || status === 'trialing';
}

export function sameTime(left: Date | null, right: Date | null): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.getTime() === right.getTime();
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
