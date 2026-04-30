import { HttpException, HttpStatus } from '@nestjs/common';
import { db } from '@db';
import { StripeService } from '../stripe/stripe.service';
import { BackgroundCheckBillingService } from './background-check-billing.service';
import { BackgroundCheckPaymentService } from './background-check-payment.service';

jest.mock('@db', () => ({
  db: {
    organizationBilling: {
      findUnique: jest.fn(),
    },
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;

function mockAsync<T>(fn: unknown): jest.MockedFunction<() => Promise<T>> {
  return fn as jest.MockedFunction<() => Promise<T>>;
}

describe('BackgroundCheckPaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws payment required when no background check payment method exists', async () => {
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce(null);
    const service = new BackgroundCheckPaymentService(
      { getClient: jest.fn() } as unknown as StripeService,
      { getBackgroundCheckPrice: jest.fn() } as unknown as BackgroundCheckBillingService,
    );

    await expect(
      service.charge({ organizationId: 'org_1', memberId: 'mem_1' }),
    ).rejects.toThrow(
      expect.objectContaining({
        status: HttpStatus.PAYMENT_REQUIRED,
      }),
    );
  });

  it('charges Stripe with payment-method scoped idempotency key', async () => {
    mockAsync<Awaited<ReturnType<typeof db.organizationBilling.findUnique>>>(
      mockedDb.organizationBilling.findUnique,
    ).mockResolvedValueOnce({
      stripeCustomerId: 'cus_1',
      stripeBackgroundCheckPaymentMethodId: 'pm_1',
    } as Awaited<ReturnType<typeof db.organizationBilling.findUnique>>);
    const paymentIntentsCreate = jest.fn().mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
    });
    const service = new BackgroundCheckPaymentService(
      {
        getClient: () => ({ paymentIntents: { create: paymentIntentsCreate } }),
      } as unknown as StripeService,
      {
        getBackgroundCheckPrice: jest.fn().mockResolvedValue({
          id: 'price_bg',
          unitAmount: 1250,
          currency: 'usd',
        }),
      } as unknown as BackgroundCheckBillingService,
    );

    await service.charge({ organizationId: 'org_1', memberId: 'mem_1' });

    expect(paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1250,
        customer: 'cus_1',
        payment_method: 'pm_1',
      }),
      { idempotencyKey: 'background-check:org_1:mem_1:price_bg:pm_1' },
    );
  });
});
