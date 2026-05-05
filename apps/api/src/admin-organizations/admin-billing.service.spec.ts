import { db } from '@db';
import { AdminBillingService } from './admin-billing.service';

jest.mock('@db', () => ({
  db: {
    organization: { findUnique: jest.fn() },
    organizationBilling: { findUnique: jest.fn() },
    organizationBillingSubscription: { findMany: jest.fn() },
    billingAuditEvent: { create: jest.fn() },
  },
}));

const mockedDb = db as unknown as {
  organization: { findUnique: jest.Mock };
  organizationBilling: { findUnique: jest.Mock };
  organizationBillingSubscription: { findMany: jest.Mock };
  billingAuditEvent: { create: jest.Mock };
};

describe('AdminBillingService', () => {
  const originalStripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const restoreStripeSecretKey = () => {
    if (typeof originalStripeSecretKey === 'string') {
      process.env.STRIPE_SECRET_KEY = originalStripeSecretKey;
      return;
    }
    delete process.env.STRIPE_SECRET_KEY;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    restoreStripeSecretKey();
    mockedDb.organization.findUnique.mockResolvedValue({
      id: 'org_1',
      name: 'Customer',
    });
    mockedDb.organizationBilling.findUnique.mockResolvedValue({
      organizationId: 'org_1',
      stripeCustomerId: 'cus_org_1',
      stripePaymentMethodId: 'pm_1',
    });
    mockedDb.organizationBillingSubscription.findMany.mockResolvedValue([
      {
        id: 'obs_1',
        skuKey: 'pentest_monthly_1',
        stripeSubscriptionId: 'sub_1',
        stripeSubscriptionItemId: 'si_1',
        stripeStatus: 'active',
      },
    ]);
    mockedDb.billingAuditEvent.create.mockResolvedValue({});
  });

  afterAll(() => {
    restoreStripeSecretKey();
  });

  it('previews subscription changes with the configured billing catalog environment', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_preview_test';
    const createPreview = jest.fn().mockResolvedValue({
      amount_due: 49900,
      currency: 'usd',
    });
    const service = new AdminBillingService(
      {
        getClient: () => ({
          invoices: { createPreview },
        }),
        isConfigured: () => true,
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.previewSubscription({
        organizationId: 'org_1',
        skuKey: 'pentest_monthly_3',
      }),
    ).resolves.toMatchObject({
      amountDue: 49900,
      currency: 'usd',
      subscriptionId: 'obs_1',
    });

    expect(createPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_details: expect.objectContaining({
          items: [
            expect.objectContaining({
              id: 'si_1',
              price: 'price_1TS3zMCxqPDT5y0WC2OyJNAv',
              quantity: 1,
            }),
          ],
        }),
      }),
    );
  });

  it('writes an audit event when admin checkout immediately changes an existing subscription', async () => {
    const service = new AdminBillingService(
      { isConfigured: () => true } as never,
      {
        createSubscriptionCheckoutSession: jest
          .fn()
          .mockResolvedValue({ changed: true }),
      } as never,
      {} as never,
      {} as never,
    );
    jest.spyOn(service, 'getStatus').mockResolvedValue({} as never);
    mockedDb.organizationBilling.findUnique.mockResolvedValue({
      organizationId: 'org_1',
      stripeCustomerId: 'cus_org_1',
      stripePaymentMethodId: null,
    });

    await service.setSubscription({
      organizationId: 'org_1',
      adminUserId: 'usr_admin',
      skuKey: 'pentest_monthly_3',
      returnUrl: 'http://localhost:3000/org_1/settings/billing',
      note: 'Upgrade for customer',
    });

    expect(mockedDb.billingAuditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_1',
        eventType: 'admin_subscription_set',
        skuKey: 'pentest_monthly_3',
        metadata: {
          adminUserId: 'usr_admin',
          note: 'Upgrade for customer',
        },
      }),
    });
  });
});
