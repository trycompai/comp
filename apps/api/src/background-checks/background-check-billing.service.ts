import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class BackgroundCheckBillingService {
  constructor(private readonly stripeService: StripeService) {}

  async getStatus(organizationId: string): Promise<{
    hasBilling: boolean;
    hasPaymentMethod: boolean;
    setupAt: Date | null;
  }> {
    const billing = await db.organizationBilling.findUnique({
      where: { organizationId },
      select: {
        stripeCustomerId: true,
        stripeBackgroundCheckPaymentMethodId: true,
        backgroundCheckPaymentMethodSetupAt: true,
      },
    });

    return {
      hasBilling: !!billing,
      hasPaymentMethod: !!billing?.stripeBackgroundCheckPaymentMethodId,
      setupAt: billing?.backgroundCheckPaymentMethodSetupAt ?? null,
    };
  }

  async createSetupSession({
    organizationId,
    successUrl,
    cancelUrl,
  }: {
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    this.validateRedirectUrl(successUrl);
    this.validateRedirectUrl(cancelUrl);

    const stripe = this.stripeService.getClient();
    const customerId = await this.findOrCreateCustomer(organizationId);
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
    this.validateRedirectUrl(returnUrl);

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

  async findOrCreateCustomer(organizationId: string): Promise<string> {
    const existingBilling = await db.organizationBilling.findUnique({
      where: { organizationId },
      select: { stripeCustomerId: true },
    });

    if (existingBilling) {
      return existingBilling.stripeCustomerId;
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    const stripe = this.stripeService.getClient();
    const customer = await stripe.customers.create({
      name: organization.name,
      metadata: { organizationId },
    });

    await db.organizationBilling.create({
      data: {
        organizationId,
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
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

  private validateRedirectUrl(url: string): void {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.BETTER_AUTH_URL;
    if (!appUrl) {
      throw new BadRequestException('App URL is not configured on the server.');
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid redirect URL.');
    }

    if (parsed.origin !== new URL(appUrl).origin) {
      throw new BadRequestException(
        'Redirect URL must belong to the application origin.',
      );
    }
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
