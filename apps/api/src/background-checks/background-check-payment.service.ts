import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import { StripeService } from '../stripe/stripe.service';
import { BackgroundCheckBillingService } from './background-check-billing.service';

@Injectable()
export class BackgroundCheckPaymentService {
  private readonly logger = new Logger(BackgroundCheckPaymentService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BackgroundCheckBillingService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  async charge(params: { organizationId: string; memberId: string }): Promise<{
    paymentIntentId: string | null;
    invoiceId: string | null;
    status: string;
    amount: number;
    currency: string;
  }> {
    const includedUsage =
      await this.entitlements.tryConsumeIncludedUsageForProduct({
        organizationId: params.organizationId,
        productKey: 'background_check',
        sourceResourceId: params.memberId,
      });

    if (includedUsage.status === 'consumed') {
      return {
        paymentIntentId: null,
        invoiceId: null,
        status: 'subscription_included',
        amount: 0,
        currency: 'usd',
      };
    }

    throw new HttpException(
      {
        error:
          includedUsage.status === 'exhausted'
            ? 'No background checks remaining in your subscription. Upgrade or wait for your monthly allowance to reset.'
            : 'Choose a background check plan before requesting a background check.',
        code:
          includedUsage.status === 'exhausted'
            ? 'background_check_subscription_exhausted'
            : 'background_check_subscription_required',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  async refund(params: {
    organizationId: string;
    memberId: string;
    paymentIntentId: string | null;
  }): Promise<string | null> {
    if (!params.paymentIntentId) {
      await this.entitlements.refundIncludedUsageForProduct({
        organizationId: params.organizationId,
        productKey: 'background_check',
        sourceResourceId: params.memberId,
        reason: 'background_check_failed',
      });
      return null;
    }

    try {
      const stripe = this.stripeService.getClient();
      const refund = await stripe.refunds.create(
        { payment_intent: params.paymentIntentId },
        {
          idempotencyKey: [
            'background-check-refund',
            params.organizationId,
            params.memberId,
            params.paymentIntentId,
          ].join(':'),
        },
      );
      return refund.id;
    } catch (error) {
      this.logger.error(
        'Failed to refund background check payment - manual refund required.',
        {
          organizationId: params.organizationId,
          memberId: params.memberId,
          paymentIntentId: params.paymentIntentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      return null;
    }
  }

  async getBackgroundCheckPrice() {
    return this.billingService.getBackgroundCheckPrice();
  }
}
