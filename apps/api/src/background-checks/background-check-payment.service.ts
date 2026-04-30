import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { BackgroundCheckBillingService } from './background-check-billing.service';

@Injectable()
export class BackgroundCheckPaymentService {
  private static readonly receiptDescription = 'Comp AI - Background Check x1';

  private static readonly statementDescriptor = 'COMP AI BG CHECK';

  private readonly logger = new Logger(BackgroundCheckPaymentService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BackgroundCheckBillingService,
  ) {}

  async charge(params: { organizationId: string; memberId: string }): Promise<{
    paymentIntentId: string;
    invoiceId: string;
    status: string;
    amount: number;
    currency: string;
  }> {
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
    const metadata = {
      source: 'comp-background-check',
      compOrganizationId: params.organizationId,
      compMemberId: params.memberId,
    };
    const idempotencyKeyParts = [
      'background-check',
      params.organizationId,
      params.memberId,
      price.id,
      billing.stripeBackgroundCheckPaymentMethodId,
    ];

    const invoice = await stripe.invoices.create(
      {
        customer: billing.stripeCustomerId,
        collection_method: 'charge_automatically',
        currency: price.currency,
        default_payment_method: billing.stripeBackgroundCheckPaymentMethodId,
        description: BackgroundCheckPaymentService.receiptDescription,
        statement_descriptor: BackgroundCheckPaymentService.statementDescriptor,
        auto_advance: false,
        metadata,
      },
      {
        idempotencyKey: [...idempotencyKeyParts, 'invoice'].join(':'),
      },
    );

    let paidInvoice: Stripe.Invoice;
    try {
      await stripe.invoiceItems.create(
        {
          customer: billing.stripeCustomerId,
          invoice: invoice.id,
          pricing: {
            price: price.id,
          },
          quantity: 1,
          description: BackgroundCheckPaymentService.receiptDescription,
          metadata,
        },
        {
          idempotencyKey: [...idempotencyKeyParts, 'line-item'].join(':'),
        },
      );

      await stripe.invoices.finalizeInvoice(
        invoice.id,
        { auto_advance: false },
        {
          idempotencyKey: [...idempotencyKeyParts, 'finalize-invoice'].join(
            ':',
          ),
        },
      );

      paidInvoice = await stripe.invoices.pay(
        invoice.id,
        {
          payment_method: billing.stripeBackgroundCheckPaymentMethodId,
          off_session: true,
          expand: ['payments'],
        },
        {
          idempotencyKey: [...idempotencyKeyParts, 'pay-invoice'].join(':'),
        },
      );
    } catch (error) {
      await this.voidInvoice({ stripe, invoiceId: invoice.id });
      throw new HttpException(
        'Background check payment failed. Update billing and try again.',
        HttpStatus.PAYMENT_REQUIRED,
        { cause: error },
      );
    }

    if (paidInvoice.status !== 'paid') {
      await this.voidInvoice({ stripe, invoiceId: invoice.id });
      throw new HttpException(
        'Background check payment failed. Update billing and try again.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const paymentIntentId = this.extractPaymentIntentId(paidInvoice);
    if (!paymentIntentId) {
      throw new HttpException(
        'Background check payment failed. Update billing and try again.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return {
      paymentIntentId,
      invoiceId: paidInvoice.id,
      status: 'succeeded',
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

  private extractPaymentIntentId(invoice: Stripe.Invoice): string | null {
    const payment = invoice.payments?.data.find(
      (invoicePayment) => invoicePayment.payment.type === 'payment_intent',
    );
    const paymentIntent = payment?.payment.payment_intent;
    if (!paymentIntent) return null;
    return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
  }

  private async voidInvoice({
    stripe,
    invoiceId,
  }: {
    stripe: Stripe;
    invoiceId: string;
  }): Promise<void> {
    try {
      await stripe.invoices.voidInvoice(invoiceId);
    } catch (error) {
      this.logger.error('Failed to void unpaid background check invoice.', {
        invoiceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
