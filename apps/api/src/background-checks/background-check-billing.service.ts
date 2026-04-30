import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { StripeService } from '../stripe/stripe.service';
import { findOrCreateBackgroundCheckBillingCustomer } from './background-check-billing-customer';
import {
  type BackgroundCheckBillingInvoice,
  listBackgroundCheckBillingInvoices,
} from './background-check-billing-invoices';
import { validateBackgroundCheckBillingRedirectUrl } from './background-check-billing-urls';

@Injectable()
export class BackgroundCheckBillingService {
  constructor(private readonly stripeService: StripeService) {}

  async getStatus(organizationId: string): Promise<{
    hasBilling: boolean;
    hasPaymentMethod: boolean;
    setupAt: Date | null;
    usage: {
      backgroundChecks: number;
      penetrationTests: number;
    };
    invoices: BackgroundCheckBillingInvoice[];
  }> {
    const [billing, backgroundChecks, penetrationTests] = await Promise.all([
      db.organizationBilling.findUnique({
        where: { organizationId },
        select: {
          stripeCustomerId: true,
          stripeBackgroundCheckPaymentMethodId: true,
          backgroundCheckPaymentMethodSetupAt: true,
        },
      }),
      db.backgroundCheckRequest.count({ where: { organizationId } }),
      db.securityPenetrationTestRun.count({ where: { organizationId } }),
    ]);
    const invoices = await listBackgroundCheckBillingInvoices({
      stripeService: this.stripeService,
      stripeCustomerId: billing?.stripeCustomerId ?? null,
    });

    return {
      hasBilling: !!billing,
      hasPaymentMethod: !!billing?.stripeBackgroundCheckPaymentMethodId,
      setupAt: billing?.backgroundCheckPaymentMethodSetupAt ?? null,
      usage: {
        backgroundChecks,
        penetrationTests,
      },
      invoices,
    };
  }

  async createSetupSession({
    organizationId,
    successUrl,
    cancelUrl,
    customerEmail,
  }: {
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<{ url: string }> {
    validateBackgroundCheckBillingRedirectUrl(successUrl);
    validateBackgroundCheckBillingRedirectUrl(cancelUrl);

    const stripe = this.stripeService.getClient();
    const customerId = await findOrCreateBackgroundCheckBillingCustomer({
      stripeService: this.stripeService,
      organizationId,
      customerEmail,
    });
    const price = await this.getBackgroundCheckPrice();

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      currency: price.currency,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        source: 'comp-background-check',
      },
    });

    if (!session.url) {
      throw new BadRequestException(
        'Failed to create Stripe Checkout session.',
      );
    }

    return { url: session.url };
  }

  async handleSetupSuccess({
    organizationId,
    sessionId,
  }: {
    organizationId: string;
    sessionId: string;
  }): Promise<{ success: true }> {
    const stripe = this.stripeService.getClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent'],
    });

    if (session.status !== 'complete') {
      throw new BadRequestException('Checkout session is not complete.');
    }

    if (
      session.metadata?.organizationId &&
      session.metadata.organizationId !== organizationId
    ) {
      throw new BadRequestException(
        'Checkout session does not belong to this organization.',
      );
    }

    const stripeCustomerId = this.extractStripeId(session.customer);
    if (!stripeCustomerId) {
      throw new BadRequestException('Checkout session is missing a customer.');
    }

    await this.assertCustomerBelongsToOrganization({
      organizationId,
      stripeCustomerId,
    });

    const setupIntent = session.setup_intent;
    if (!setupIntent || typeof setupIntent === 'string') {
      throw new BadRequestException(
        'Checkout session is missing a setup intent.',
      );
    }

    const paymentMethodId = this.extractStripeId(setupIntent.payment_method);
    if (!paymentMethodId) {
      throw new BadRequestException(
        'Setup intent is missing a payment method.',
      );
    }

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    await db.organizationBilling.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeCustomerId,
        stripeBackgroundCheckPaymentMethodId: paymentMethodId,
        backgroundCheckPaymentMethodSetupAt: new Date(),
      },
      update: {
        stripeCustomerId,
        stripeBackgroundCheckPaymentMethodId: paymentMethodId,
        backgroundCheckPaymentMethodSetupAt: new Date(),
      },
    });

    return { success: true };
  }

  async createBillingPortalSession({
    organizationId,
    returnUrl,
  }: {
    organizationId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    validateBackgroundCheckBillingRedirectUrl(returnUrl);

    const stripe = this.stripeService.getClient();
    const billing = await db.organizationBilling.findUnique({
      where: { organizationId },
      select: { stripeCustomerId: true },
    });

    if (!billing) {
      throw new NotFoundException(
        'No billing record found for this organization.',
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  }

  async getBackgroundCheckPrice(): Promise<{
    id: string;
    unitAmount: number;
    currency: string;
  }> {
    const priceId = process.env.STRIPE_BACKGROUND_CHECK_PRICE_ID;
    if (!priceId) {
      throw new BadRequestException(
        'Background check pricing is not configured. Contact support.',
      );
    }

    const stripe = this.stripeService.getClient();
    const price = await stripe.prices.retrieve(priceId);
    if (price.unit_amount === null || price.unit_amount === undefined) {
      throw new BadRequestException(
        'Background check pricing is not configured. Contact support.',
      );
    }

    return {
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
    };
  }

  private extractStripeId(
    value: string | { id?: string } | null,
  ): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.id ?? null;
  }

  private async assertCustomerBelongsToOrganization({
    organizationId,
    stripeCustomerId,
  }: {
    organizationId: string;
    stripeCustomerId: string;
  }): Promise<void> {
    const billing = await db.organizationBilling.findUnique({
      where: { organizationId },
      select: { stripeCustomerId: true },
    });

    if (billing?.stripeCustomerId === stripeCustomerId) {
      return;
    }

    const stripe = this.stripeService.getClient();
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (
      customer.deleted ||
      customer.metadata?.organizationId !== organizationId
    ) {
      throw new BadRequestException(
        'Checkout session does not belong to this organization.',
      );
    }
  }
}
