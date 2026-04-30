import { db } from '@db';
import type { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import type { PentestCreditsService } from './pentest-credits.service';
import { SecurityPenetrationTestsService } from './security-penetration-tests.service';

const mockMacedPentestsCreate = jest.fn();

jest.mock(
  '@maced/api-client',
  () => ({
    createMacedClient: () => ({
      pentests: {
        create: mockMacedPentestsCreate,
      },
    }),
    MacedApiError: class MacedApiError extends Error {},
    MacedWebhookSignatureError: class MacedWebhookSignatureError extends Error {
      code = 'invalid_signature';
    },
    MacedClient: {
      webhooks: {
        constructEvent: jest.fn(),
      },
    },
  }),
  { virtual: true },
);

jest.mock('@db', () => ({
  db: {
    securityPenetrationTestRun: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    secret: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

type MockDb = {
  securityPenetrationTestRun: {
    upsert: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
  };
  secret: {
    upsert: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('SecurityPenetrationTestsService billing usage', () => {
  const originalMacedApiKey = process.env.MACED_API_KEY;
  const mockedDb = db as unknown as MockDb;
  const credits: jest.Mocked<
    Pick<PentestCreditsService, 'getStatus' | 'debitOrThrow' | 'refund'>
  > = {
    getStatus: jest.fn(),
    debitOrThrow: jest.fn(),
    refund: jest.fn(),
  };
  const billingEntitlements: jest.Mocked<
    Pick<
      BillingEntitlementsService,
      'tryConsumeIncludedUsage' | 'refundIncludedUsage'
    >
  > = {
    tryConsumeIncludedUsage: jest.fn(),
    refundIncludedUsage: jest.fn(),
  };
  let service: SecurityPenetrationTestsService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MACED_API_KEY = 'mc_dev_test_maced_api_key';
    mockMacedPentestsCreate.mockResolvedValue({
      id: 'run_subscription',
      status: 'provisioning',
    });
    credits.debitOrThrow.mockResolvedValue({
      balance: 4,
      totalGranted: 5,
      totalConsumed: 1,
      lastGrantSource: 'trial',
    });
    credits.refund.mockResolvedValue();
    billingEntitlements.tryConsumeIncludedUsage.mockResolvedValue({
      status: 'consumed',
      subscriptionId: 'obs_1',
    });
    billingEntitlements.refundIncludedUsage.mockResolvedValue();
    mockedDb.securityPenetrationTestRun.upsert.mockResolvedValue({});
    mockedDb.securityPenetrationTestRun.updateMany.mockResolvedValue({
      count: 1,
    });
    mockedDb.$transaction.mockImplementation(
      (callback: (tx: MockDb) => Promise<void>) => callback(mockedDb),
    );
    service = new SecurityPenetrationTestsService(
      credits as unknown as PentestCreditsService,
      billingEntitlements as unknown as BillingEntitlementsService,
    );
  });

  afterAll(() => {
    process.env.MACED_API_KEY = originalMacedApiKey;
  });

  it('persists the subscription usage source on subscription-backed runs', async () => {
    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
    });

    expect(credits.debitOrThrow).not.toHaveBeenCalled();
    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          billingUsageSourceId: expect.stringMatching(/^pending:/),
        }),
      }),
    );
  });

  it('refunds subscription usage on terminal failure for subscription-backed runs', async () => {
    mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
      organizationId: 'org_123',
      billingUsageSourceId: 'pending:run_subscription',
    });
    const refundInvoker = service as unknown as {
      refundOnTerminalFailure: (
        providerRunId: string,
        eventType: 'pentest.failed',
      ) => Promise<void>;
    };

    await refundInvoker.refundOnTerminalFailure(
      'run_subscription',
      'pentest.failed',
    );

    expect(billingEntitlements.refundIncludedUsage).toHaveBeenCalledWith({
      organizationId: 'org_123',
      skuKey: 'pentest_monthly_5',
      sourceResourceId: 'pending:run_subscription',
      reason: 'pentest.failed',
      tx: mockedDb,
    });
    expect(credits.refund).not.toHaveBeenCalled();
  });

  it('keeps legacy credit refunds for terminal failures without subscription usage', async () => {
    mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
      organizationId: 'org_123',
      billingUsageSourceId: null,
    });
    const refundInvoker = service as unknown as {
      refundOnTerminalFailure: (
        providerRunId: string,
        eventType: 'pentest.failed',
      ) => Promise<void>;
    };

    await refundInvoker.refundOnTerminalFailure('run_legacy', 'pentest.failed');

    expect(credits.refund).toHaveBeenCalledWith(
      'org_123',
      'run_legacy',
      'pentest.failed',
      mockedDb,
    );
    expect(billingEntitlements.refundIncludedUsage).not.toHaveBeenCalled();
  });
});
