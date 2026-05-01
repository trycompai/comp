import { db } from '@db';
import { listBillingUsageRows } from './billing-usage';

jest.mock('@db', () => ({
  db: {
    backgroundCheckRequest: { findMany: jest.fn() },
    securityPenetrationTestRun: { findMany: jest.fn() },
    billingUsageEvent: { findMany: jest.fn() },
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;
const backgroundCheckFindMany = mockedDb.backgroundCheckRequest
  .findMany as unknown as jest.Mock;
const pentestRunFindMany = mockedDb.securityPenetrationTestRun
  .findMany as unknown as jest.Mock;
const billingUsageEventFindMany = mockedDb.billingUsageEvent
  .findMany as unknown as jest.Mock;

describe('listBillingUsageRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('combines run history with subscription allowance details', async () => {
    backgroundCheckFindMany.mockResolvedValue([
      {
        id: 'bcr_1',
        memberId: 'mem_1',
        employeeName: 'Ada Lovelace',
        employeeEmail: 'ada@example.com',
        status: 'completed',
        stripePaymentStatus: 'succeeded',
        createdAt: new Date('2026-04-30T10:00:00.000Z'),
        updatedAt: new Date('2026-04-30T10:05:00.000Z'),
      },
    ]);
    pentestRunFindMany.mockResolvedValue([
      {
        id: 'ptr_1',
        providerRunId: 'run_1',
        billingUsageSourceId: 'pending:run_1',
        createdAt: new Date('2026-04-30T11:00:00.000Z'),
        updatedAt: new Date('2026-04-30T11:05:00.000Z'),
      },
    ]);
    billingUsageEventFindMany.mockResolvedValue([
      {
        skuKey: 'background_checks_monthly_25',
        eventType: 'consume',
        sourceResourceId: 'mem_1',
        stripeInvoiceId: null,
      },
      {
        skuKey: 'pentest_monthly_5',
        eventType: 'consume',
        sourceResourceId: 'pending:run_1',
        stripeInvoiceId: null,
      },
    ]);

    const rows = await listBillingUsageRows({
      organizationId: 'org_1',
      subscriptions: [
        {
          skuKey: 'background_checks_monthly_25',
          includedQuantity: 25,
          usedQuantity: 2,
          currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
        },
        {
          skuKey: 'pentest_monthly_5',
          includedQuantity: 5,
          usedQuantity: 1,
          currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
        },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        service: 'Penetration Test',
        details: 'run_1',
        billingType: 'Subscription allowance',
        subscriptionRemaining: 4,
      }),
      expect.objectContaining({
        service: 'Background Check',
        details: 'Ada Lovelace (ada@example.com)',
        billingType: 'Subscription allowance',
        subscriptionRemaining: 23,
      }),
    ]);
  });

  it('labels legacy pentest rows independently of current subscription state', async () => {
    backgroundCheckFindMany.mockResolvedValue([]);
    pentestRunFindMany.mockResolvedValue([
      {
        id: 'ptr_legacy',
        providerRunId: 'run_legacy',
        billingUsageSourceId: null,
        createdAt: new Date('2026-04-30T11:00:00.000Z'),
        updatedAt: new Date('2026-04-30T11:05:00.000Z'),
      },
    ]);
    billingUsageEventFindMany.mockResolvedValue([]);

    const rows = await listBillingUsageRows({
      organizationId: 'org_1',
      subscriptions: [
        {
          skuKey: 'pentest_monthly_5',
          includedQuantity: 5,
          usedQuantity: 1,
          currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
        },
      ],
    });

    expect(rows[0]).toEqual(
      expect.objectContaining({
        service: 'Penetration Test',
        billingType: 'Trial credit',
      }),
    );
  });

  it('uses the usage event sku when multiple subscriptions share a product', async () => {
    backgroundCheckFindMany.mockResolvedValue([
      {
        id: 'bcr_2',
        memberId: 'mem_2',
        employeeName: 'Grace Hopper',
        employeeEmail: 'grace@example.com',
        status: 'completed',
        stripePaymentStatus: 'succeeded',
        createdAt: new Date('2026-04-30T12:00:00.000Z'),
        updatedAt: new Date('2026-04-30T12:05:00.000Z'),
      },
    ]);
    pentestRunFindMany.mockResolvedValue([]);
    billingUsageEventFindMany.mockResolvedValue([
      {
        skuKey: 'background_checks_monthly_10',
        eventType: 'consume',
        sourceResourceId: 'mem_2',
        stripeInvoiceId: null,
      },
    ]);

    const rows = await listBillingUsageRows({
      organizationId: 'org_1',
      subscriptions: [
        {
          skuKey: 'background_checks_monthly_3',
          includedQuantity: 3,
          usedQuantity: 3,
          currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
        },
        {
          skuKey: 'background_checks_monthly_10',
          includedQuantity: 10,
          usedQuantity: 4,
          currentPeriodEnd: new Date('2026-05-30T00:00:00.000Z'),
        },
      ],
    });

    expect(rows[0]).toEqual(
      expect.objectContaining({
        skuKey: 'background_checks_monthly_10',
        subscriptionRemaining: 6,
        subscriptionIncluded: 10,
      }),
    );
  });

  it('fetches usage events for the displayed source resources without a global cap', async () => {
    backgroundCheckFindMany.mockResolvedValue([
      {
        id: 'bcr_3',
        memberId: 'mem_3',
        employeeName: 'Katherine Johnson',
        employeeEmail: 'katherine@example.com',
        status: 'completed',
        stripePaymentStatus: 'succeeded',
        createdAt: new Date('2026-04-30T13:00:00.000Z'),
        updatedAt: new Date('2026-04-30T13:05:00.000Z'),
      },
    ]);
    pentestRunFindMany.mockResolvedValue([
      {
        id: 'ptr_3',
        providerRunId: 'run_3',
        billingUsageSourceId: 'pending:run_3',
        createdAt: new Date('2026-04-30T14:00:00.000Z'),
        updatedAt: new Date('2026-04-30T14:05:00.000Z'),
      },
    ]);
    billingUsageEventFindMany.mockResolvedValue([]);

    await listBillingUsageRows({
      organizationId: 'org_1',
      subscriptions: [],
    });

    const usageQuery = billingUsageEventFindMany.mock.calls[0][0];
    expect(usageQuery.where.sourceResourceId).toEqual({
      in: ['mem_3', 'pending:run_3'],
    });
    expect(usageQuery).not.toHaveProperty('take');
  });
});
