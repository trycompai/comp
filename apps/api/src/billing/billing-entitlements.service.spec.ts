import { db } from '@db';
import { BillingEntitlementsService } from './billing-entitlements.service';

jest.mock('@db', () => ({
  db: {
    organizationBillingSubscription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    billingAuditEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

type MockTx = {
  organizationBillingSubscription: {
    upsert: jest.Mock;
    updateMany: jest.Mock;
  };
  billingUsageEvent: {
    create: jest.Mock;
    findUnique: jest.Mock;
  };
};

const mockedDb = db as unknown as {
  organizationBillingSubscription: { findUnique: jest.Mock; findMany: jest.Mock };
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
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      billingUsageEvent: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    mockedDb.$transaction.mockImplementation(
      (callback: (tx: MockTx) => Promise<void>) => callback(tx),
    );
    mockedDb.billingAuditEvent.create.mockResolvedValue({});
    service = new BillingEntitlementsService();
  });

  it('applies same-period subscription updates that shorten currentPeriodEnd', async () => {
    mockedDb.organizationBillingSubscription.findUnique.mockResolvedValue({
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

    expect(tx.organizationBillingSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({ usedQuantity: 0 }),
      }),
    );
    expect(tx.billingUsageEvent.create).not.toHaveBeenCalled();
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
    tx.organizationBillingSubscription.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.tryConsumeIncludedUsageForProduct({
        organizationId: 'org_1',
        productKey: 'pentest',
        sourceResourceId: 'run_1',
      }),
    ).resolves.toEqual({ status: 'consumed', subscriptionId: 'obs_1' });

    expect(mockedDb.organizationBillingSubscription.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_skuKey: {
          organizationId: 'org_1',
          skuKey: 'pentest_monthly_4',
        },
      },
    });
  });
});
