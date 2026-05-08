import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { db } from '@db';
import {
  type BillingProductKey,
  getBillingSku,
  getBillingSkuProductKey,
  resolveBillingCatalogEnvironment,
  isSubscriptionBillingSkuKey,
} from '@trycompai/billing';
import { StripeService } from '../stripe/stripe.service';
import { BillingCreditsService } from './billing-credits.service';
import { findOrCreateBillingCustomer } from './billing-customer';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { listBillingInvoices } from './billing-invoices';
import {
  type BillingPreferencesInput,
  getBillingPreferences,
  updateBillingPreferences,
} from './billing-preferences';
import { validateBillingRedirectUrl } from './billing-redirect-urls';
import {
  createBillingSetupSession,
  handleBillingSetupSuccess,
} from './billing-setup-sessions';
import { assertStripeBillingConfigured } from './billing-stripe-config';
import {
  changeSubscriptionPlan,
  findProductSubscriptions,
} from './billing-subscription-plans';
import type { BillingStatus } from './billing.types';
import { listBillingUsageRows } from './billing-usage';

@Injectable()
export class BillingService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly entitlements: BillingEntitlementsService,
    // Optional so existing unit tests that hand-construct BillingService
    // (without a credits service) keep working. In production the
    // BillingModule always provides it.
    @Optional() private readonly credits?: BillingCreditsService,
  ) {}

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
    const [invoices, preferences, usageRows, creditBalances] =
      await Promise.all([
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
        // Sum wallet balances per product. There can be multiple
        // BillingCreditBalance rows per (org, product) when grants are
        // scoped to a specific SKU, so we aggregate before returning.
        this.credits
          ? this.credits.listBalances(organizationId)
          : Promise.resolve([]),
      ]);

    const creditBalancesByProduct = new Map<BillingProductKey, number>();
    for (const balance of creditBalances) {
      const current = creditBalancesByProduct.get(balance.productKey) ?? 0;
      creditBalancesByProduct.set(balance.productKey, current + balance.balance);
    }

    return {
      hasBilling: !!billing,
      hasPaymentMethod: !!billing?.stripePaymentMethodId,
      setupAt: billing?.paymentMethodUpdatedAt ?? null,
      usage: { backgroundChecks, penetrationTests },
      preferences,
      trialEligibility: getTrialEligibility(subscriptions),
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
      creditBalances: Array.from(creditBalancesByProduct.entries()).map(
        ([productKey, balance]) => ({ productKey, balance }),
      ),
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
    return createBillingSetupSession({
      ...params,
      stripeService: this.stripeService,
    });
  }

  async handleSetupSuccess(params: {
    organizationId: string;
    sessionId: string;
  }): Promise<{ success: true }> {
    return handleBillingSetupSuccess({
      ...params,
      stripeService: this.stripeService,
    });
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
  }): Promise<{ url: string } | { changed: true }> {
    validateBillingRedirectUrl(params.successUrl);
    validateBillingRedirectUrl(params.cancelUrl);
    if (!isSubscriptionBillingSkuKey(params.skuKey)) {
      throw new BadRequestException('Unknown subscription SKU.');
    }
    assertStripeBillingConfigured(this.stripeService);

    const environment = resolveBillingCatalogEnvironment({
      stripeSecretKey: process.env.STRIPE_SECRET_KEY,
      nodeEnv: process.env.NODE_ENV,
    });
    const sku = getBillingSku({ environment, skuKey: params.skuKey });
    const productSubscriptions = await findProductSubscriptions({
      organizationId: params.organizationId,
      productKey: sku.productKey,
    });
    const existingSubscription =
      productSubscriptions.find(
        (subscription) =>
          subscription.stripeStatus === 'active' ||
          subscription.stripeStatus === 'trialing',
      ) ?? null;
    if (existingSubscription) {
      if (existingSubscription.skuKey === sku.key) {
        throw new BadRequestException('This plan is already active.');
      }
      return changeSubscriptionPlan({
        organizationId: params.organizationId,
        subscription: existingSubscription,
        skuKey: sku.key,
        stripePriceId: sku.stripePriceId,
        includedQuantity: sku.includedUsage?.quantity ?? 0,
        stripeService: this.stripeService,
        entitlements: this.entitlements,
      });
    }

    const customerId = await findOrCreateBillingCustomer({
      stripeService: this.stripeService,
      organizationId: params.organizationId,
      customerEmail: params.customerEmail,
    });
    const stripe = this.stripeService.getClient();
    const applyTrial =
      productSubscriptions.length === 0 && typeof sku.trialDays === 'number';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: sku.stripePriceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      ...(applyTrial ? { payment_method_collection: 'always' } : {}),
      metadata: {
        organizationId: params.organizationId,
        skuKey: sku.key,
        source: 'comp-billing-subscription',
      },
      subscription_data: {
        ...(applyTrial ? { trial_period_days: sku.trialDays } : {}),
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

function getTrialEligibility(
  subscriptions: Array<{ skuKey: string }>,
): Record<BillingProductKey, boolean> {
  const productHistory = new Set<BillingProductKey>();
  for (const subscription of subscriptions) {
    const productKey = getBillingSkuProductKey(subscription.skuKey);
    if (productKey) productHistory.add(productKey);
  }
  return {
    pentest: !productHistory.has('pentest'),
    background_check: !productHistory.has('background_check'),
  };
}
