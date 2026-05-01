import { db } from '@db';
import { BillingCreditsService } from './billing-credits.service';

jest.mock('@db', () => ({
  db: {
    billingCreditBalance: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    billingCreditEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

type MockTx = {
  billingCreditEvent: { create: jest.Mock };
  billingCreditBalance: { update: jest.Mock; updateMany: jest.Mock };
};

const mockedDb = db as unknown as {
  billingCreditBalance: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findFirstOrThrow: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    create: jest.Mock;
  };
  billingCreditEvent: { findMany: jest.Mock; findFirst: jest.Mock };
  $transaction: jest.Mock;
};

describe('BillingCreditsService', () => {
  let service: BillingCreditsService;
  let tx: MockTx;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      billingCreditEvent: { create: jest.fn() },
      billingCreditBalance: {
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockedDb.$transaction.mockImplementation(
      (callback: (tx: MockTx) => Promise<unknown>) => callback(tx),
    );
    mockedDb.billingCreditEvent.findFirst.mockResolvedValue(null);
    service = new BillingCreditsService();
  });

  it('grants credits to an org-scoped product balance', async () => {
    mockedDb.billingCreditBalance.findFirst.mockResolvedValue({
      id: 'bcb_1',
      organizationId: 'org_1',
      productKey: 'pentest',
      skuKey: null,
    });
    mockedDb.billingCreditBalance.findUniqueOrThrow.mockResolvedValue({
      id: 'bcb_1',
      productKey: 'pentest',
      skuKey: null,
      balance: 3,
      totalGranted: 3,
      totalConsumed: 0,
      totalRefunded: 0,
      lastSource: 'manual',
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    await expect(
      service.grant({
        organizationId: 'org_1',
        productKey: 'pentest',
        quantity: 3,
        source: 'manual',
        note: 'CS goodwill',
        adminUserId: 'usr_1',
      }),
    ).resolves.toMatchObject({ balance: 3, productKey: 'pentest' });

    expect(tx.billingCreditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org_1',
          productKey: 'pentest',
          quantity: 3,
          adminUserId: 'usr_1',
        }),
      }),
    );
    expect(tx.billingCreditBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bcb_1' },
        data: expect.objectContaining({ balance: { increment: 3 } }),
      }),
    );
  });

  it('consumes one available manual credit atomically', async () => {
    mockedDb.billingCreditBalance.findMany.mockResolvedValue([
      {
        id: 'bcb_1',
        organizationId: 'org_1',
        productKey: 'background_check',
        skuKey: null,
        balance: 1,
      },
    ]);

    await expect(
      service.tryConsumeForProduct({
        organizationId: 'org_1',
        productKey: 'background_check',
        sourceResourceId: 'mem_1',
      }),
    ).resolves.toEqual({ status: 'consumed' });

    expect(tx.billingCreditBalance.updateMany).toHaveBeenCalledWith({
      where: { id: 'bcb_1', balance: { gt: 0 } },
      data: {
        balance: { decrement: 1 },
        totalConsumed: { increment: 1 },
      },
    });
  });

  it('returns exhausted when a concurrent consume drains the selected balance', async () => {
    mockedDb.billingCreditBalance.findMany.mockResolvedValue([
      {
        id: 'bcb_1',
        organizationId: 'org_1',
        productKey: 'background_check',
        skuKey: null,
        balance: 1,
      },
    ]);
    tx.billingCreditBalance.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.tryConsumeForProduct({
        organizationId: 'org_1',
        productKey: 'background_check',
        sourceResourceId: 'mem_1',
      }),
    ).resolves.toEqual({ status: 'exhausted' });
  });

  it('tries another available balance when the first selected balance is drained concurrently', async () => {
    mockedDb.billingCreditBalance.findMany.mockResolvedValue([
      {
        id: 'bcb_1',
        organizationId: 'org_1',
        productKey: 'background_check',
        skuKey: null,
        balance: 1,
      },
      {
        id: 'bcb_2',
        organizationId: 'org_1',
        productKey: 'background_check',
        skuKey: 'background_checks_monthly_3',
        balance: 2,
      },
    ]);
    tx.billingCreditBalance.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(
      service.tryConsumeForProduct({
        organizationId: 'org_1',
        productKey: 'background_check',
        sourceResourceId: 'mem_1',
      }),
    ).resolves.toEqual({ status: 'consumed' });

    expect(tx.billingCreditBalance.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'bcb_1', balance: { gt: 0 } },
      data: {
        balance: { decrement: 1 },
        totalConsumed: { increment: 1 },
      },
    });
    expect(tx.billingCreditBalance.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'bcb_2', balance: { gt: 0 } },
      data: {
        balance: { decrement: 1 },
        totalConsumed: { increment: 1 },
      },
    });
    expect(tx.billingCreditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          balanceId: 'bcb_2',
          skuKey: 'background_checks_monthly_3',
        }),
      }),
    );
  });

  it('treats consume retries as consumed before checking balance', async () => {
    mockedDb.billingCreditEvent.findFirst.mockResolvedValue({ id: 'bce_1' });

    await expect(
      service.tryConsumeForProduct({
        organizationId: 'org_1',
        productKey: 'background_check',
        sourceResourceId: 'mem_1',
      }),
    ).resolves.toEqual({ status: 'consumed' });

    expect(mockedDb.billingCreditBalance.findMany).not.toHaveBeenCalled();
  });

  it('uses a stable refund idempotency key across reasons', async () => {
    mockedDb.billingCreditEvent.findFirst.mockResolvedValue({
      id: 'bce_consume_1',
      balanceId: 'bcb_1',
      productKey: 'pentest',
      skuKey: null,
      quantity: 1,
    });

    await expect(
      service.refundForProduct({
        organizationId: 'org_1',
        productKey: 'pentest',
        sourceResourceId: 'run_1',
        reason: 'first reason',
      }),
    ).resolves.toBe(true);

    expect(tx.billingCreditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idempotencyKey: 'credit-refund:org_1:pentest:run_1',
          note: 'first reason',
        }),
      }),
    );
  });

  it('uses the provided transaction client for credit refunds', async () => {
    const transactionClient = {
      billingCreditEvent: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'bce_consume_1',
          balanceId: 'bcb_1',
          productKey: 'pentest',
          skuKey: null,
          quantity: 1,
        }),
        create: jest.fn(),
      },
      billingCreditBalance: { update: jest.fn() },
    };

    await expect(
      service.refundForProduct({
        organizationId: 'org_1',
        productKey: 'pentest',
        sourceResourceId: 'run_1',
        reason: 'canceled',
        tx: transactionClient as never,
      }),
    ).resolves.toBe(true);

    expect(transactionClient.billingCreditEvent.create).toHaveBeenCalled();
    expect(mockedDb.$transaction).not.toHaveBeenCalled();
  });
});
