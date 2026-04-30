import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import {
  type BillingSkuKey,
  getBillingSku,
  isSubscriptionBillingSkuKey,
} from '@trycompai/billing';
import { StripeService } from '../stripe/stripe.service';
import { findOrCreateBillingCustomer } from './billing-customer';
import { listBillingInvoices } from './billing-invoices';
import {
  type BillingPreferencesInput,
  getBillingPreferences,
  updateBillingPreferences,
} from './billing-preferences';
import { validateBillingRedirectUrl } from './billing-redirect-urls';
import { assertStripeBillingConfigured } from './billing-stripe-config';
import { extractStripeId } from './billing-stripe-ids';
import type { BillingStatus } from './billing.types';
import { listBillingUsageRows } from './billing-usage';

@Injectable()
export class BillingService {
  constructor(private readonly stripeService: StripeService) {}

  async getStatus(organizationId: string): Promise<BillingStatus> {
    const [
      organization,
      billing,
      subscriptions,
      backgroundChecks,
      penetrationTests,
    ] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { name: true },
      }),
      db.organizationBilling.findUnique({
        where: { organizationId },
        select: {
          stripeCustomerId: true,
          stripePaymentMethodId: true,
          paymentMethodUpdatedAt: true,
        },
      }),
      db.organizationBillingSubscription.findMany({
        where: { organizationId },
        orderBy: { skuKey: 'asc' },
      }),
      db.backgroundCheckRequest.count({ where: { organizationId } }),
      db.securityPenetrationTestRun.count({ where: { organizationId } }),
    ]);
    const [invoices, preferences, usageRows] = await Promise.all([
      listBillingInvoices({
        stripeService: this.stripeService,
        stripeCustomerId: billing?.stripeCustomerId ?? null,
      }),
      getBillingPreferences({
        stripeService: this.stripeService,
        stripeCustomerId: billing?.stripeCustomerId ?? null,
        fallbackCompanyName: organization.name,
      }),
      listBillingUsageRows({ organizationId, subscriptions }),
    ]);

    return {
      hasBilling: !!billing,
      hasPaymentMethod: !!billing?.stripePaymentMethodId,
      setupAt: billing?.paymentMethodUpdatedAt ?? null,
      usage: { backgroundChecks, penetrationTests },
      preferences,
      usageRows,
      subscriptions: subscriptions.map((subscription) => ({
        skuKey: subscription.skuKey,
        status: subscription.stripeStatus,
        includedQuantity: subscription.includedQuantity,
        usedQuantity: subscription.usedQuantity,
        currentPeriodStart:
          subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      })),
      invoices,
    };
  }

  async updatePreferences(params: {
    organizationId: string;
    preferences: BillingPreferencesInput;
  }): Promise<BillingStatus> {
    assertStripeBillingConfigured(this.stripeService);

    const result = await updateBillingPreferences({
      stripeService: this.stripeService,
      organizationId: params.organizationId,
      preferences: params.preferences,
    });

    await db.billingAuditEvent.create({
      data: {
        organizationId: params.organizationId,
        eventType: 'billing_preferences_updated',
        metadata: {
          stripeCustomerId: result.stripeCustomerId,
          billingEmail: result.preferences.billingEmail,
        },
      },
    });

    return this.getStatus(params.organizationId);
  }

  async createSetupSession(params: {
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<{ url: string }> {
    validateBillingRedirectUrl(params.successUrl);
    validateBillingRedirectUrl(params.cancelUrl);
    assertStripeBillingConfigured(this.stripeService);

    const stripe = this.stripeService.getClient();
    const customerId = await findOrCreateBillingCustomer({
      stripeService: this.stripeService,
      organizationId: params.organizationId,
      customerEmail: params.customerEmail,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      currency: 'usd',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        organizationId: params.organizationId,
        source: 'comp-billing-setup',
      },
    });

    if (!session.url) {
      throw new BadRequestException(
        'Failed to create Stripe Checkout session.',
      );
    }

    return { url: session.url };
  }

  async handleSetupSuccess(params: {
    organizationId: string;
    sessionId: string;
  }): Promise<{ success: true }> {
    assertStripeBillingConfigured(this.stripeService);

    const stripe = this.stripeService.getClient();
    const session = await stripe.checkout.sessions.retrieve(params.sessionId, {
      expand: ['setup_intent'],
    });

    if (session.status !== 'complete') {
      throw new BadRequestException('Checkout session is not complete.');
    }

    if (session.metadata?.organizationId !== params.organizationId) {
      throw new BadRequestException(
        'Checkout session does not belong to this organization.',
      );
    }

    const stripeCustomerId = extractStripeId(session.customer);
    if (!stripeCustomerId) {
      throw new BadRequestException('Checkout session is missing a customer.');
    }
    const billing = await db.organizationBilling.findUnique({
      where: { organizationId: params.organizationId },
      select: { stripeCustomerId: true },
    });
    if (billing && billing.stripeCustomerId !== stripeCustomerId) {
      throw new BadRequestException(
        'Checkout session customer does not match this organization.',
      );
    }

    const setupIntent = session.setup_intent;
    if (!setupIntent || typeof setupIntent === 'string') {
      throw new BadRequestException(
        'Checkout session is missing a setup intent.',
      );
    }

    const paymentMethodId = extractStripeId(setupIntent.payment_method);
    if (!paymentMethodId) {
      throw new BadRequestException(
        'Setup intent is missing a payment method.',
      );
    }

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    await db.organizationBilling.upsert({
      where: { organizationId: params.organizationId },
      create: {
        organizationId: params.organizationId,
        stripeCustomerId,
        stripePaymentMethodId: paymentMethodId,
        paymentMethodUpdatedAt: new Date(),
      },
      update: {
        stripeCustomerId,
        stripePaymentMethodId: paymentMethodId,
        paymentMethodUpdatedAt: new Date(),
      },
    });

    return { success: true };
  }

  async createBillingPortalSession(params: {
    organizationId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    validateBillingRedirectUrl(params.returnUrl);
    assertStripeBillingConfigured(this.stripeService);

    const billing = await db.organizationBilling.findUnique({
      where: { organizationId: params.organizationId },
      select: { stripeCustomerId: true },
    });
    if (!billing) {
      throw new NotFoundException(
        'No billing record found for this organization.',
      );
    }

    const session = await this.stripeService
      .getClient()
      .billingPortal.sessions.create({
        customer: billing.stripeCustomerId,
        return_url: params.returnUrl,
      });
    return { url: session.url };
  }

  async createSubscriptionCheckoutSession(params: {
    organizationId: string;
    skuKey: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<{ url: string }> {
    validateBillingRedirectUrl(params.successUrl);
    validateBillingRedirectUrl(params.cancelUrl);
    if (!isSubscriptionBillingSkuKey(params.skuKey)) {
      throw new BadRequestException('Unknown subscription SKU.');
    }
    assertStripeBillingConfigured(this.stripeService);

    const sku = getBillingSku({ skuKey: params.skuKey });
    const customerId = await findOrCreateBillingCustomer({
      stripeService: this.stripeService,
      organizationId: params.organizationId,
      customerEmail: params.customerEmail,
    });
    const stripe = this.stripeService.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: sku.stripePriceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        organizationId: params.organizationId,
        skuKey: sku.key,
        source: 'comp-billing-subscription',
      },
      subscription_data: {
        metadata: {
          organizationId: params.organizationId,
          skuKey: sku.key,
          source: 'comp-billing-subscription',
        },
      },
    });

    if (!session.url) {
      throw new BadRequestException(
        'Failed to create Stripe Checkout session.',
      );
    }
    return { url: session.url };
  }
}
