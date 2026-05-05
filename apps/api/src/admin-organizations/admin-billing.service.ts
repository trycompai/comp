import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import {
  getBillingSku,
  resolveBillingCatalogEnvironment,
  type BillingSkuKey,
} from '@trycompai/billing';
import { BillingCreditsService } from '../billing/billing-credits.service';
import { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import { listBillingInvoices } from '../billing/billing-invoices';
import {
  getBillingPreferences,
  type BillingPreferencesInput,
  updateBillingPreferences,
} from '../billing/billing-preferences';
import { validateBillingRedirectUrl } from '../billing/billing-redirect-urls';
import { assertStripeBillingConfigured } from '../billing/billing-stripe-config';
import { changeSubscriptionPlan } from '../billing/billing-subscription-plans';
import { BillingService } from '../billing/billing.service';
import { StripeService } from '../stripe/stripe.service';
import {
  getProductFromSku,
  isDowngrade,
  listAdminBillingPlans,
  mapAdminSubscription,
} from './admin-billing.helpers';
import {
  createAdminSubscription,
  getOrgBillingContext,
  writeBillingAudit,
} from './admin-billing.data';
import type {
  AdminBillingPreview,
  AdminBillingStatus,
} from './admin-billing.types';

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BillingService,
    private readonly credits: BillingCreditsService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  async getStatus(organizationId: string): Promise<AdminBillingStatus> {
    const { organization, billing, subscriptions } =
      await getOrgBillingContext(organizationId);
    const [
      preferences,
      invoices,
      usageRows,
      creditBalances,
      creditEvents,
      auditEvents,
    ] = await Promise.all([
      getBillingPreferences({
        stripeService: this.stripeService,
        stripeCustomerId: billing?.stripeCustomerId ?? null,
        fallbackCompanyName: organization.name,
      }),
      listBillingInvoices({
        stripeService: this.stripeService,
        stripeCustomerId: billing?.stripeCustomerId ?? null,
      }),
      this.billingService
        .getStatus(organizationId)
        .then((status) => status.usageRows),
      this.credits.listBalances(organizationId),
      this.credits.listEvents({ organizationId, take: 50 }),
      db.billingAuditEvent.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      organization,
      stripeCustomerId: billing?.stripeCustomerId ?? null,
      hasPaymentMethod: !!billing?.stripePaymentMethodId,
      paymentMethodUpdatedAt:
        billing?.paymentMethodUpdatedAt?.toISOString() ?? null,
      preferences,
      availablePlans: listAdminBillingPlans(),
      subscriptions: subscriptions.map(mapAdminSubscription),
      creditBalances,
      creditEvents,
      usageRows,
      invoices,
      failedInvoices: invoices.filter((invoice) =>
        ['open', 'past_due', 'uncollectible'].includes(invoice.status),
      ),
      auditEvents: auditEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        skuKey: event.skuKey,
        stripeEventId: event.stripeEventId,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async updatePreferences(params: {
    organizationId: string;
    adminUserId: string;
    preferences: BillingPreferencesInput;
    note: string;
    confirmBillingEmailChange?: boolean;
  }): Promise<AdminBillingStatus> {
    assertStripeBillingConfigured(this.stripeService);
    const status = await this.getStatus(params.organizationId);
    const currentEmail = status.preferences.billingEmail;
    if (
      currentEmail &&
      currentEmail !== params.preferences.billingEmail &&
      !params.confirmBillingEmailChange
    ) {
      throw new BadRequestException('Confirm billing email change.');
    }

    const result = await updateBillingPreferences({
      stripeService: this.stripeService,
      organizationId: params.organizationId,
      preferences: params.preferences,
    });
    await writeBillingAudit({
      organizationId: params.organizationId,
      eventType: 'admin_billing_preferences_updated',
      metadata: {
        adminUserId: params.adminUserId,
        stripeCustomerId: result.stripeCustomerId,
        billingEmail: result.preferences.billingEmail,
        note: params.note,
      },
    });
    return this.getStatus(params.organizationId);
  }

  async previewSubscription(params: {
    organizationId: string;
    skuKey: BillingSkuKey;
  }): Promise<AdminBillingPreview> {
    const { billing, subscriptions } = await getOrgBillingContext(
      params.organizationId,
    );
    if (!billing) throw new NotFoundException('Billing customer not found.');
    assertStripeBillingConfigured(this.stripeService);
    const sku = getBillingSku({
      environment: resolveBillingCatalogEnvironment(),
      skuKey: params.skuKey,
    });
    const current = subscriptions.find(
      (item) =>
        item.stripeStatus !== 'canceled' &&
        getProductFromSku(item.skuKey) === sku.productKey,
    );
    const prorationDate = Math.floor(Date.now() / 1000);
    const invoice = await this.stripeService
      .getClient()
      .invoices.createPreview({
        customer: billing.stripeCustomerId,
        ...(current ? { subscription: current.stripeSubscriptionId } : {}),
        subscription_details: {
          proration_date: current ? prorationDate : undefined,
          items: [
            current
              ? {
                  id: current.stripeSubscriptionItemId,
                  price: sku.stripePriceId,
                  quantity: 1,
                }
              : { price: sku.stripePriceId, quantity: 1 },
          ],
        },
      });
    return {
      amountDue: invoice.amount_due,
      currency: invoice.currency,
      subscriptionId: current?.id ?? null,
      prorationDate,
    };
  }

  async setSubscription(params: {
    organizationId: string;
    adminUserId: string;
    skuKey: BillingSkuKey;
    returnUrl: string;
    note: string;
    confirmDowngrade?: boolean;
  }): Promise<AdminBillingStatus | { url: string }> {
    validateBillingRedirectUrl(params.returnUrl);
    assertStripeBillingConfigured(this.stripeService);
    const { billing, subscriptions } = await getOrgBillingContext(
      params.organizationId,
    );
    const sku = getBillingSku({
      environment: resolveBillingCatalogEnvironment(),
      skuKey: params.skuKey,
    });
    const current = subscriptions.find(
      (item) =>
        item.stripeStatus !== 'canceled' &&
        getProductFromSku(item.skuKey) === sku.productKey,
    );
    const latestProductSubscription = subscriptions.find(
      (item) => getProductFromSku(item.skuKey) === sku.productKey,
    );
    if (
      current &&
      isDowngrade({
        currentIncludedQuantity: current.includedQuantity,
        nextSkuKey: params.skuKey,
      }) &&
      !params.confirmDowngrade
    ) {
      throw new BadRequestException('Confirm plan downgrade.');
    }
    if (!billing?.stripePaymentMethodId) {
      const result =
        await this.billingService.createSubscriptionCheckoutSession({
          organizationId: params.organizationId,
          skuKey: params.skuKey,
          successUrl: params.returnUrl,
          cancelUrl: params.returnUrl,
        });
      if (!('changed' in result)) return result;
      await writeBillingAudit({
        organizationId: params.organizationId,
        eventType: 'admin_subscription_set',
        skuKey: sku.key,
        metadata: { adminUserId: params.adminUserId, note: params.note },
      });
      return this.getStatus(params.organizationId);
    }
    if (current) {
      await changeSubscriptionPlan({
        organizationId: params.organizationId,
        subscription: current,
        skuKey: sku.key,
        stripePriceId: sku.stripePriceId,
        includedQuantity: sku.includedUsage?.quantity ?? 0,
        stripeService: this.stripeService,
        entitlements: this.entitlements,
      });
    } else {
      await createAdminSubscription({
        organizationId: params.organizationId,
        stripeCustomerId: billing.stripeCustomerId,
        skuKey: sku.key,
        stripePriceId: sku.stripePriceId,
        includedQuantity: sku.includedUsage?.quantity ?? 0,
        idempotencyKey: [
          'admin-subscription-create',
          params.organizationId,
          sku.key,
          billing.stripeCustomerId,
          latestProductSubscription?.stripeSubscriptionId ?? 'none',
        ].join(':'),
        stripeService: this.stripeService,
        entitlements: this.entitlements,
      });
    }
    await writeBillingAudit({
      organizationId: params.organizationId,
      eventType: 'admin_subscription_set',
      skuKey: sku.key,
      metadata: { adminUserId: params.adminUserId, note: params.note },
    });
    return this.getStatus(params.organizationId);
  }
}
