import { db } from '@db';
import type { BillingSkuKey } from '@trycompai/billing';
import type { BillingUsageRow } from './billing.types';

type SubscriptionSummary = {
  skuKey: string;
  includedQuantity: number;
  usedQuantity: number;
  currentPeriodEnd: Date | null;
};

const backgroundCheckSku = 'background_checks_monthly_25';
const pentestSku = 'pentest_monthly_5';

export async function listBillingUsageRows(params: {
  organizationId: string;
  subscriptions: SubscriptionSummary[];
}): Promise<BillingUsageRow[]> {
  const [backgroundChecks, pentestRuns, usageEvents] = await Promise.all([
    db.backgroundCheckRequest.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        memberId: true,
        employeeName: true,
        employeeEmail: true,
        status: true,
        stripePaymentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.securityPenetrationTestRun.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        providerRunId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.billingUsageEvent.findMany({
      where: {
        organizationId: params.organizationId,
        eventType: { in: ['consume', 'one_time'] },
        sourceResourceId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        skuKey: true,
        eventType: true,
        sourceResourceId: true,
        stripeInvoiceId: true,
      },
    }),
  ]);

  const usageBySource = new Map(
    usageEvents
      .filter((event) => event.sourceResourceId)
      .map((event) => [event.sourceResourceId as string, event]),
  );

  const rows = [
    ...backgroundChecks.map((request) => {
      const usage = usageBySource.get(request.memberId);
      return toBillingUsageRow({
        id: request.id,
        service: 'Background Check',
        skuKey: backgroundCheckSku,
        details: `${request.employeeName} (${request.employeeEmail})`,
        status: formatStatus(request.status),
        billingType: formatBillingType(usage?.eventType, usage?.stripeInvoiceId),
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        subscriptions: params.subscriptions,
      });
    }),
    ...pentestRuns.map((run) =>
      toBillingUsageRow({
        id: run.id,
        service: 'Penetration Test',
        skuKey: pentestSku,
        details: run.providerRunId,
        status: 'Created',
        billingType: formatPentestBillingType(params.subscriptions),
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        subscriptions: params.subscriptions,
      }),
    ),
  ];

  return rows.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function toBillingUsageRow(params: {
  id: string;
  service: BillingUsageRow['service'];
  skuKey: BillingSkuKey;
  details: string;
  status: string;
  billingType: string;
  createdAt: Date;
  updatedAt: Date;
  subscriptions: SubscriptionSummary[];
}): BillingUsageRow {
  const subscription = params.subscriptions.find((item) => item.skuKey === params.skuKey);
  const remaining = subscription
    ? Math.max(subscription.includedQuantity - subscription.usedQuantity, 0)
    : null;

  return {
    id: params.id,
    service: params.service,
    skuKey: params.skuKey,
    details: params.details,
    status: params.status,
    billingType: params.billingType,
    createdAt: params.createdAt.toISOString(),
    updatedAt: params.updatedAt.toISOString(),
    subscriptionRemaining: remaining,
    subscriptionIncluded: subscription?.includedQuantity ?? null,
    subscriptionPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
  };
}

function formatBillingType(eventType?: string, stripeInvoiceId?: string | null): string {
  if (eventType === 'consume') return 'Subscription allowance';
  if (eventType === 'one_time') return stripeInvoiceId ? 'One-time invoice' : 'One-time';
  return 'Legacy / manual';
}

function formatPentestBillingType(subscriptions: SubscriptionSummary[]): string {
  return subscriptions.some((item) => item.skuKey === pentestSku)
    ? 'Subscription allowance'
    : 'Trial credit';
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
