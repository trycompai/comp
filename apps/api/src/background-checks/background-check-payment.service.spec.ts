jest.mock('@db', () => ({ db: {} }));

import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import { StripeService } from '../stripe/stripe.service';
import { BackgroundCheckBillingService } from './background-check-billing.service';
import { BackgroundCheckPaymentService } from './background-check-payment.service';

function mockEntitlements(
  overrides: Partial<BillingEntitlementsService> = {},
): BillingEntitlementsService {
  return {
    tryConsumeIncludedUsageForProduct: jest
      .fn()
      .mockResolvedValue({ status: 'not_configured' }),
    refundIncludedUsageForProduct: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as BillingEntitlementsService;
}

describe('BackgroundCheckPaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('consumes background check subscription allowance', async () => {
    const tryConsumeIncludedUsageForProduct = jest
      .fn()
      .mockResolvedValue({ status: 'consumed', subscriptionId: 'obs_1' });
    const entitlements = mockEntitlements({
      tryConsumeIncludedUsageForProduct,
    });
    const service = new BackgroundCheckPaymentService(
      { getClient: jest.fn() } as unknown as StripeService,
      {} as BackgroundCheckBillingService,
      entitlements,
    );

    await expect(
      service.charge({ organizationId: 'org_1', memberId: 'mem_1' }),
    ).resolves.toEqual({
      paymentIntentId: null,
      invoiceId: null,
      status: 'subscription_included',
      amount: 0,
      currency: 'usd',
    });

    expect(tryConsumeIncludedUsageForProduct).toHaveBeenCalledWith({
      organizationId: 'org_1',
      productKey: 'background_check',
      sourceResourceId: 'mem_1',
    });
  });

  it('blocks when no background check subscription is configured', async () => {
    const service = new BackgroundCheckPaymentService(
      { getClient: jest.fn() } as unknown as StripeService,
      {} as BackgroundCheckBillingService,
      mockEntitlements(),
    );

    try {
      await service.charge({ organizationId: 'org_1', memberId: 'mem_1' });
      throw new Error('Expected charge to require payment');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      if (!(error instanceof HttpException)) throw error;
      expect(error.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          code: 'background_check_subscription_required',
        }),
      );
    }
  });

  it('blocks when background check subscription allowance is exhausted', async () => {
    const service = new BackgroundCheckPaymentService(
      { getClient: jest.fn() } as unknown as StripeService,
      {} as BackgroundCheckBillingService,
      mockEntitlements({
        tryConsumeIncludedUsageForProduct: jest
          .fn()
          .mockResolvedValue({ status: 'exhausted', subscriptionId: 'obs_1' }),
      }),
    );

    try {
      await service.charge({ organizationId: 'org_1', memberId: 'mem_1' });
      throw new Error('Expected charge to require payment');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      if (!(error instanceof HttpException)) throw error;
      expect(error.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(error.getResponse()).toEqual(
        expect.objectContaining({
          code: 'background_check_subscription_exhausted',
        }),
      );
    }
  });

  it('refunds the consumed background check allowance by product family', async () => {
    const refundIncludedUsageForProduct = jest
      .fn()
      .mockResolvedValue(undefined);
    const entitlements = mockEntitlements({ refundIncludedUsageForProduct });
    const service = new BackgroundCheckPaymentService(
      { getClient: jest.fn() } as unknown as StripeService,
      {} as BackgroundCheckBillingService,
      entitlements,
    );

    await expect(
      service.refund({
        organizationId: 'org_1',
        memberId: 'mem_1',
        paymentIntentId: null,
      }),
    ).resolves.toBeNull();

    expect(refundIncludedUsageForProduct).toHaveBeenCalledWith({
      organizationId: 'org_1',
      productKey: 'background_check',
      sourceResourceId: 'mem_1',
      reason: 'background_check_failed',
    });
  });

  it('does not throw when refunding consumed allowance fails', async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    const entitlements = mockEntitlements({
      refundIncludedUsageForProduct: jest
        .fn()
        .mockRejectedValue(new Error('refund failed')),
    });
    const service = new BackgroundCheckPaymentService(
      { getClient: jest.fn() } as unknown as StripeService,
      {} as BackgroundCheckBillingService,
      entitlements,
    );

    await expect(
      service.refund({
        organizationId: 'org_1',
        memberId: 'mem_1',
        paymentIntentId: null,
      }),
    ).resolves.toBeNull();

    expect(loggerSpy).toHaveBeenCalledWith(
      'Failed to refund background check included usage - manual credit review required.',
      expect.objectContaining({
        organizationId: 'org_1',
        memberId: 'mem_1',
        error: 'refund failed',
      }),
    );
    loggerSpy.mockRestore();
  });
});
