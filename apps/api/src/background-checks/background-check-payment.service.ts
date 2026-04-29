import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { StripeService } from '../stripe/stripe.service';
import { BackgroundCheckBillingService } from './background-check-billing.service';

@Injectable()
export class BackgroundCheckPaymentService {
  private readonly logger = new Logger(BackgroundCheckPaymentService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BackgroundCheckBillingService,
  ) {}

  async charge(params: {
    organizationId: string;
    memberId: string;
  }): Promise<{ paymentIntentId: string; status: string; amount: number; currency: string }> {
    const billing = await db.organizationBilling.findUnique({
      where: { organizationId: params.organizationId },
      select: {
        stripeCustomerId: true,
        stripeBackgroundCheckPaymentMethodId: true,
      },
    });

    if (!billing?.stripeBackgroundCheckPaymentMethodId) {
      throw new HttpException(
        'No background check payment method on file. Update billing first.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const price = await this.billingService.getBackgroundCheckPrice();
    const stripe = this.stripeService.getClient();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        customer: billing.stripeCustomerId,
        amount: price.unitAmount,
        currency: price.currency,
        payment_method: billing.stripeBackgroundCheckPaymentMethodId,
        off_session: true,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          source: 'comp-background-check',
          compOrganizationId: params.organizationId,
          compMemberId: params.memberId,
        },
      },
      {
        idempotencyKey: [
          'background-check',
          params.organizationId,
          params.memberId,
          price.id,
          billing.stripeBackgroundCheckPaymentMethodId,
        ].join(':'),
      },
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new HttpException(
        'Background check payment failed. Update billing and try again.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: price.unitAmount,
      currency: price.currency,
    };
  }

  async refund(params: {
    organizationId: string;
    memberId: string;
    paymentIntentId: string;
  }): Promise<string | null> {
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
        'Failed to refund background check payment — manual refund required.',
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
}
