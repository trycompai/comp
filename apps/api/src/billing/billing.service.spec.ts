import { BadRequestException } from '@nestjs/common';
import { db } from '@db';
import { BillingService } from './billing.service';
import type { StripeService } from '../stripe/stripe.service';

jest.mock('@db', () => ({
  db: {
    organization: {
      findUniqueOrThrow: jest.fn(),
    },
    organizationBilling: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    organizationBillingSubscription: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    backgroundCheckRequest: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    securityPenetrationTestRun: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    billingUsageEvent: {
      findMany: jest.fn(),
    },
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;
const organizationFindUniqueOrThrow = mockedDb.organization
  .findUniqueOrThrow as unknown as jest.Mock;
const organizationBillingFindUnique = mockedDb.organizationBilling
  .findUnique as unknown as jest.Mock;
const organizationBillingCreate = mockedDb.organizationBilling
  .create as unknown as jest.Mock;
const organizationBillingSubscriptionFindMany = mockedDb
  .organizationBillingSubscription.findMany as unknown as jest.Mock;
const organizationBillingSubscriptionUpdate = mockedDb
  .organizationBillingSubscription.update as unknown as jest.Mock;
const backgroundCheckRequestCount = mockedDb.backgroundCheckRequest
  .count as unknown as jest.Mock;
const backgroundCheckRequestFindMany = mockedDb.backgroundCheckRequest
  .findMany as unknown as jest.Mock;
const securityPenetrationTestRunCount = mockedDb.securityPenetrationTestRun
  .count as unknown as jest.Mock;
const securityPenetrationTestRunFindMany = mockedDb.securityPenetrationTestRun
  .findMany as unknown as jest.Mock;
const billingUsageEventFindMany = mockedDb.billingUsageEvent
  .findMany as unknown as jest.Mock;

function mockStripeService(client: unknown): StripeService {
  return {
    isConfigured: () => client !== null,
    getClient: () => client,
  } as unknown as StripeService;
}

describe('BillingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    organizationFindUniqueOrThrow.mockResolvedValue({
      id: 'org_1',
      name: 'Test Company',
    });
    organizationBillingFindUnique.mockResolvedValue(null);
    organizationBillingCreate.mockResolvedValue({
      id: 'obil_1',
      organizationId: 'org_1',
      stripeCustomerId: 'cus_1',
      stripePaymentMethodId: null,
      paymentMethodUpdatedAt: null,
      createdAt: new Date('2026-04-30T00:00:00.000Z'),
      updatedAt: new Date('2026-04-30T00:00:00.000Z'),
    });
    organizationBillingSubscriptionFindMany.mockResolvedValue([]);
    organizationBillingSubscriptionUpdate.mockResolvedValue({});
    backgroundCheckRequestCount.mockResolvedValue(0);
    backgroundCheckRequestFindMany.mockResolvedValue([]);
    securityPenetrationTestRunCount.mockResolvedValue(0);
    securityPenetrationTestRunFindMany.mockResolvedValue([]);
    billingUsageEventFindMany.mockResolvedValue([]);
  });

  it('creates a Stripe subscription checkout session from the billing catalog', async () => {
    const customersCreate = jest.fn().mockResolvedValue({ id: 'cus_1' });
    const sessionsCreate = jest.fn().mockResolvedValue({
      url: 'https://checkout.stripe.test/session',
    });
    const service = new BillingService(
      mockStripeService({
        customers: { create: customersCreate },
        checkout: { sessions: { create: sessionsCreate } },
      }),
      { syncSubscriptionItem: jest.fn() } as never,
    );

    await expect(
      service.createSubscriptionCheckoutSession({
        organizationId: 'org_1',
        skuKey: 'pentest_monthly_1',
        successUrl: 'http://localhost:3000/org_1/settings/billing/success',
        cancelUrl: 'http://localhost:3000/org_1/settings/billing',
        customerEmail: 'admin@example.com',
      }),
    ).resolves.toEqual({ url: 'https://checkout.stripe.test/session' });

    expect(customersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        metadata: { organizationId: 'org_1' },
      }),
      { idempotencyKey: 'organization-billing-customer:org_1' },
    );
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_1',
        line_items: [{ price: 'price_1TS3ziCkFWhKYvHI0H5TWxNI', quantity: 1 }],
        payment_method_collection: 'always',
        metadata: expect.objectContaining({
          organizationId: 'org_1',
          skuKey: 'pentest_monthly_1',
        }),
        subscription_data: expect.objectContaining({
          trial_period_days: 14,
        }),
      }),
    );
  });

  it('does not apply a trial when the product has historical subscription rows', async () => {
    const customersCreate = jest.fn().mockResolvedValue({ id: 'cus_1' });
    const sessionsCreate = jest.fn().mockResolvedValue({
      url: 'https://checkout.stripe.test/session',
    });
    organizationBillingSubscriptionFindMany.mockResolvedValue([
      {
        id: 'obs_1',
        skuKey: 'pentest_monthly_3',
        stripeSubscriptionId: 'sub_1',
        stripeSubscriptionItemId: 'si_1',
        stripeStatus: 'canceled',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ]);
    const service = new BillingService(
      mockStripeService({
        customers: { create: customersCreate },
        checkout: { sessions: { create: sessionsCreate } },
      }),
      { syncSubscriptionItem: jest.fn() } as never,
    );

    await service.createSubscriptionCheckoutSession({
      organizationId: 'org_1',
      skuKey: 'pentest_monthly_1',
      successUrl: 'http://localhost:3000/org_1/settings/billing/success',
      cancelUrl: 'http://localhost:3000/org_1/settings/billing',
    });

    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({
        payment_method_collection: 'always',
      }),
    );
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.not.objectContaining({
          trial_period_days: expect.any(Number),
        }),
      }),
    );
  });

  it('never applies a trial to higher tiers', async () => {
    const customersCreate = jest.fn().mockResolvedValue({ id: 'cus_1' });
    const sessionsCreate = jest.fn().mockResolvedValue({
      url: 'https://checkout.stripe.test/session',
    });
    const service = new BillingService(
      mockStripeService({
        customers: { create: customersCreate },
        checkout: { sessions: { create: sessionsCreate } },
      }),
      { syncSubscriptionItem: jest.fn() } as never,
    );

    await service.createSubscriptionCheckoutSession({
      organizationId: 'org_1',
      skuKey: 'pentest_monthly_3',
      successUrl: 'http://localhost:3000/org_1/settings/billing/success',
      cancelUrl: 'http://localhost:3000/org_1/settings/billing',
    });

    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.not.objectContaining({
          trial_period_days: expect.any(Number),
        }),
      }),
    );
  });

  it('marks trial eligibility false after any product subscription history', async () => {
    organizationBillingSubscriptionFindMany.mockResolvedValue([
      {
        id: 'obs_1',
        skuKey: 'background_checks_monthly_10',
        stripeStatus: 'canceled',
        includedQuantity: 10,
        usedQuantity: 0,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    const service = new BillingService(
      mockStripeService({
        invoices: { list: jest.fn().mockResolvedValue({ data: [] }) },
        customers: { retrieve: jest.fn().mockResolvedValue({}) },
        paymentMethods: { retrieve: jest.fn() },
      }),
      { syncSubscriptionItem: jest.fn() } as never,
    );

    await expect(service.getStatus('org_1')).resolves.toMatchObject({
      trialEligibility: {
        pentest: true,
        background_check: false,
      },
    });
  });

  it('changes an existing product subscription instead of creating another checkout', async () => {
    const subscriptionsUpdate = jest.fn().mockResolvedValue({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: null,
      items: {
        data: [
          {
            id: 'si_1',
            current_period_start: 1775001600,
            current_period_end: 1777593600,
          },
        ],
      },
    });
    const writeAuditEvent = jest.fn().mockResolvedValue(undefined);
    organizationBillingSubscriptionFindMany.mockResolvedValue([
      {
        id: 'obs_1',
        skuKey: 'pentest_monthly_1',
        stripeSubscriptionId: 'sub_1',
        stripeSubscriptionItemId: 'si_1',
        stripeStatus: 'active',
        currentPeriodStart: new Date('2026-04-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-05-01T00:00:00.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ]);
    const service = new BillingService(
      mockStripeService({
        subscriptions: { update: subscriptionsUpdate },
      }),
      { syncSubscriptionItem: jest.fn(), writeAuditEvent } as never,
    );

    await expect(
      service.createSubscriptionCheckoutSession({
        organizationId: 'org_1',
        skuKey: 'pentest_monthly_3',
        successUrl: 'http://localhost:3000/org_1/settings/billing/success',
        cancelUrl: 'http://localhost:3000/org_1/settings/billing',
      }),
    ).resolves.toEqual({ changed: true });

    expect(subscriptionsUpdate).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({
        items: [{ id: 'si_1', price: 'price_1TS3ziCkFWhKYvHI1nbXC7UU' }],
      }),
      expect.anything(),
    );
    expect(organizationBillingSubscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'obs_1' },
        data: expect.objectContaining({
          skuKey: 'pentest_monthly_3',
          stripeSubscriptionItemId: 'si_1',
          includedQuantity: 3,
        }),
      }),
    );
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org_1',
        eventType: 'subscription_plan_changed',
        skuKey: 'pentest_monthly_3',
      }),
    );
  });

  it('does not create subscription checkout for one-time SKUs', async () => {
    const service = new BillingService(
      mockStripeService({
        checkout: { sessions: { create: jest.fn() } },
      }),
      { syncSubscriptionItem: jest.fn() } as never,
    );

    await expect(
      service.createSubscriptionCheckoutSession({
        organizationId: 'org_1',
        skuKey: 'background_check_one_time',
        successUrl: 'http://localhost:3000/org_1/settings/billing/success',
        cancelUrl: 'http://localhost:3000/org_1/settings/billing',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a controlled error when Stripe is not configured', async () => {
    const service = new BillingService(mockStripeService(null), {
      syncSubscriptionItem: jest.fn(),
    } as never);

    await expect(
      service.createSubscriptionCheckoutSession({
        organizationId: 'org_1',
        skuKey: 'pentest_monthly_1',
        successUrl: 'http://localhost:3000/org_1/settings/billing/success',
        cancelUrl: 'http://localhost:3000/org_1/settings/billing',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
