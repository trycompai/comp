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
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;
const organizationFindUniqueOrThrow = mockedDb.organization
  .findUniqueOrThrow as unknown as jest.Mock;
const organizationBillingFindUnique = mockedDb.organizationBilling
  .findUnique as unknown as jest.Mock;
const organizationBillingCreate = mockedDb.organizationBilling
  .create as unknown as jest.Mock;

function mockStripeService(client: unknown): StripeService {
  return {
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
    );

    await expect(
      service.createSubscriptionCheckoutSession({
        organizationId: 'org_1',
        skuKey: 'pentest_monthly_5',
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
        line_items: [{ price: 'price_1TRya6CkFWhKYvHI1sJ2M2no', quantity: 1 }],
        metadata: expect.objectContaining({
          organizationId: 'org_1',
          skuKey: 'pentest_monthly_5',
        }),
      }),
    );
  });

  it('does not create subscription checkout for one-time SKUs', async () => {
    const service = new BillingService(
      mockStripeService({
        checkout: { sessions: { create: jest.fn() } },
      }),
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
});
