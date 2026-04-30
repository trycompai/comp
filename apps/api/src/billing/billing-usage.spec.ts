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
});
