import { db } from '@db';
import { BillingEntitlementsService } from './billing-entitlements.service';

jest.mock('@db', () => ({
  db: {
    organizationBillingSubscription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    billingUsageEvent: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    billingAuditEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

type MockTx = {
  organizationBillingSubscription: {
    create: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
  };
  billingUsageEvent: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
  };
};

const mockedDb = db as unknown as {
  organizationBillingSubscription: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  billingUsageEvent: { findFirst: jest.Mock; findUnique: jest.Mock };
  billingAuditEvent: { create: jest.Mock };
  $transaction: jest.Mock;
};

describe('BillingEntitlementsService', () => {
  let tx: MockTx;
  let service: BillingEntitlementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      organizationBillingSubscription: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      billingUsageEvent: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    mockedDb.billingUsageEvent.findFirst.mockResolvedValue(null);
    mockedDb.billingUsageEvent.findUnique.mockResolvedValue(null);
    mockedDb.$transaction.mockImplementation(
      (callback: (tx: MockTx) => Promise<unknown>) => callback(tx),
    );
    mockedDb.billingAuditEvent.create.mockResolvedValue({});
    service = new BillingEntitlementsService();
  });

  it('applies same-period subscription updates that shorten currentPeriodEnd', async () => {
    tx.organizationBillingSubscription.findUnique.mockResolvedValue({
      id: 'obs_1',
      stripeSubscriptionItemId: 'si_1',
      currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-05-01T00:00:00.000Z'),
    });

    await service.syncSubscriptionItem({
      organizationId: 'org_1',
      skuKey: 'pentest_monthly_5',
      stripeSubscriptionId: 'sub_1',
      stripeSubscriptionItemId: 'si_1',
      stripePriceId: 'price_1',
      stripeStatus: 'canceled',
      currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-04-15T00:00:00.000Z'),
      includedQuantity: 5,
      cancelAtPeriodEnd: false,
      canceledAt: new Date('2026-04-10T00:00:00.000Z'),
      stripeEventId: 'evt_1',
    });

    expect(tx.organizationBillingSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'obs_1',
          currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
        }),
        data: expect.not.objectContaining({ usedQuantity: 0 }),
      }),
    );
    expect(tx.billingUsageEvent.create).not.toHaveBeenCalled();
  });

  it('retries without resetting usage when another sync already advanced the period', async () => {
    tx.organizationBillingSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'obs_1',
        stripeSubscriptionItemId: 'si_1',
        currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-05-01T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'obs_1',
        stripeSubscriptionItemId: 'si_1',
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      });
    tx.organizationBillingSubscription.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await service.syncSubscriptionItem({
      organizationId: 'org_1',
      skuKey: 'pentest_monthly_5',
      stripeSubscriptionId: 'sub_1',
      stripeSubscriptionItemId: 'si_1',
      stripePriceId: 'price_1',
      stripeStatus: 'active',
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      includedQuantity: 5,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      stripeEventId: 'evt_2',
    });

    expect(
      tx.organizationBillingSubscription.updateMany,
    ).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: 'obs_1',
          currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
        },
        data: expect.objectContaining({ usedQuantity: 0 }),
      }),
    );
    expect(
      tx.organizationBillingSubscription.updateMany,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          id: 'obs_1',
          currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        },
        data: expect.not.objectContaining({ usedQuantity: 0 }),
      }),
    );
    expect(tx.billingUsageEvent.create).not.toHaveBeenCalled();
    expect(mockedDb.billingAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'subscription_synced',
          skuKey: 'pentest_monthly_5',
        }),
      }),
    );
  });

  it('consumes the active subscription for a product family', async () => {
    mockedDb.organizationBillingSubscription.findMany.mockResolvedValue([
      {
        id: 'obs_1',
        skuKey: 'pentest_monthly_4',
        stripeStatus: 'active',
        usedQuantity: 1,
        includedQuantity: 4,
        currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
      },
    ]);
    mockedDb.organizationBillingSubscription.findUnique.mockResolvedValue({
      id: 'obs_1',
      skuKey: 'pentest_monthly_4',
      stripeStatus: 'active',
      usedQuantity: 1,
      includedQuantity: 4,
      stripeSubscriptionItemId: 'si_1',
      currentPeriodStart: new Date('2026-04-30T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
    });
    tx.organizationBillingSubscription.updateMany.mockResolvedValue({
      count: 1,
    });

    await expect(
      service.tryConsumeIncludedUsageForProduct({
        organizationId: 'org_1',
        productKey: 'pentest',
        sourceResourceId: 'run_1',
      }),
    ).resolves.toEqual({ status: 'consumed', subscriptionId: 'obs_1' });

    expect(
      mockedDb.organizationBillingSubscription.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        organizationId_skuKey: {
          organizationId: 'org_1',
          skuKey: 'pentest_monthly_4',
        },
      },
    });
  });

  it('treats product consumption retries as consumed before credit fallback', async () => {
    const credits = { tryConsumeForProduct: jest.fn() };
    service = new BillingEntitlementsService(credits as never);
    mockedDb.organizationBillingSubscription.findMany.mockResolvedValue([
      {
        id: 'obs_1',
        skuKey: 'pentest_monthly_1',
        stripeStatus: 'active',
        usedQuantity: 1,
        includedQuantity: 1,
        currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
      },
    ]);
    mockedDb.billingUsageEvent.findFirst.mockResolvedValue({
      skuKey: 'pentest_monthly_1',
    });

    await expect(
      service.tryConsumeIncludedUsageForProduct({
        organizationId: 'org_1',
        productKey: 'pentest',
        sourceResourceId: 'run_1',
      }),
    ).resolves.toEqual({ status: 'consumed', subscriptionId: 'obs_1' });

    expect(credits.tryConsumeForProduct).not.toHaveBeenCalled();
  });

  it('falls back to credits when included usage is exhausted during consume', async () => {
    const credits = {
      tryConsumeForProduct: jest.fn().mockResolvedValue({ status: 'consumed' }),
    };
    service = new BillingEntitlementsService(credits as never);
    mockedDb.organizationBillingSubscription.findMany.mockResolvedValue([
      {
        id: 'obs_1',
        skuKey: 'pentest_monthly_1',
        stripeStatus: 'active',
        usedQuantity: 0,
        includedQuantity: 1,
        currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
      },
    ]);
    mockedDb.organizationBillingSubscription.findUnique.mockResolvedValue({
      id: 'obs_1',
      skuKey: 'pentest_monthly_1',
      stripeStatus: 'active',
      usedQuantity: 0,
      includedQuantity: 1,
      stripeSubscriptionItemId: 'si_1',
      currentPeriodStart: new Date('2026-04-30T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
    });
    tx.organizationBillingSubscription.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.tryConsumeIncludedUsageForProduct({
        organizationId: 'org_1',
        productKey: 'pentest',
        sourceResourceId: 'run_1',
      }),
    ).resolves.toEqual({ status: 'consumed', subscriptionId: 'manual_credit' });

    expect(credits.tryConsumeForProduct).toHaveBeenCalledWith({
      organizationId: 'org_1',
      productKey: 'pentest',
      sourceResourceId: 'run_1',
    });
  });

  it('returns exhausted instead of throwing when allowance is concurrently exhausted', async () => {
    mockedDb.organizationBillingSubscription.findUnique.mockResolvedValue({
      id: 'obs_1',
      skuKey: 'background_checks_monthly_3',
      stripeStatus: 'active',
      usedQuantity: 0,
      includedQuantity: 1,
      stripeSubscriptionItemId: 'si_1',
      currentPeriodStart: new Date('2026-04-30T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
    });
    tx.organizationBillingSubscription.updateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.tryConsumeIncludedUsage({
        organizationId: 'org_1',
        skuKey: 'background_checks_monthly_3',
        sourceResourceId: 'mem_1',
      }),
    ).resolves.toEqual({ status: 'exhausted', subscriptionId: 'obs_1' });
  });

  it('uses credit refund fallback even with a transaction client', async () => {
    const credits = { refundForProduct: jest.fn().mockResolvedValue(true) };
    service = new BillingEntitlementsService(credits as never);
    tx.billingUsageEvent.findFirst.mockResolvedValue(null);

    await service.refundIncludedUsageForProduct({
      organizationId: 'org_1',
      productKey: 'pentest',
      sourceResourceId: 'run_1',
      reason: 'canceled',
      tx: tx as never,
    });

    expect(credits.refundForProduct).toHaveBeenCalledWith({
      organizationId: 'org_1',
      productKey: 'pentest',
      sourceResourceId: 'run_1',
      reason: 'canceled',
      tx,
    });
  });

  it('uses a stable included-usage refund key across reasons', async () => {
    tx.billingUsageEvent.findUnique.mockResolvedValue({
      stripeSubscriptionItemId: 'si_1',
      periodStart: new Date('2026-04-30T00:00:00.000Z'),
      periodEnd: new Date('2026-05-30T00:00:00.000Z'),
    });

    await service.refundIncludedUsage({
      organizationId: 'org_1',
      skuKey: 'pentest_monthly_1',
      sourceResourceId: 'run_1',
      reason: 'first reason',
      tx: tx as never,
    });

    expect(tx.billingUsageEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey: 'refund:org_1:pentest_monthly_1:run_1',
        }),
      }),
    );
  });
});
