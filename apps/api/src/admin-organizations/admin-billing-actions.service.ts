import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { BillingCreditsService } from '../billing/billing-credits.service';
import { BillingService } from '../billing/billing.service';
import { validateBillingRedirectUrl } from '../billing/billing-redirect-urls';
import { assertStripeBillingConfigured } from '../billing/billing-stripe-config';
import { StripeService } from '../stripe/stripe.service';
import { getInvoiceCustomerId } from './admin-billing.helpers';
import { getOrgBillingContext, writeBillingAudit } from './admin-billing.data';
import { AdminBillingService } from './admin-billing.service';
import type { AdminBillingStatus } from './admin-billing.types';

@Injectable()
export class AdminBillingActionsService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BillingService,
    private readonly credits: BillingCreditsService,
    private readonly adminBilling: AdminBillingService,
  ) {}

  async cancelSubscription(params: {
    organizationId: string;
    adminUserId: string;
    subscriptionId: string;
    mode: 'period_end' | 'immediate';
    note: string;
    confirm?: string;
  }): Promise<AdminBillingStatus> {
    assertStripeBillingConfigured(this.stripeService);
    const subscription = await this.getScopedSubscription(params);
    if (params.mode === 'immediate' && params.confirm !== 'cancel now') {
      throw new BadRequestException('Type "cancel now" to confirm.');
    }
    const stripe = this.stripeService.getClient();
    const updated =
      params.mode === 'immediate'
        ? await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
            cancellation_details: { comment: params.note },
          })
        : await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
            cancellation_details: { comment: params.note },
          });
    await db.organizationBillingSubscription.updateMany({
      where: { id: subscription.id, organizationId: params.organizationId },
      data: {
        stripeStatus: updated.status,
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        canceledAt: updated.canceled_at
          ? new Date(updated.canceled_at * 1000)
          : null,
      },
    });
    await writeBillingAudit({
      organizationId: params.organizationId,
      eventType: 'admin_subscription_canceled',
      skuKey: subscription.skuKey,
      metadata: {
        adminUserId: params.adminUserId,
        subscriptionId: subscription.id,
        mode: params.mode,
        note: params.note,
      },
    });
    return this.adminBilling.getStatus(params.organizationId);
  }

  async resumeSubscription(params: {
    organizationId: string;
    adminUserId: string;
    subscriptionId: string;
    note: string;
  }): Promise<AdminBillingStatus> {
    assertStripeBillingConfigured(this.stripeService);
    const subscription = await this.getScopedSubscription(params);
    const updated = await this.stripeService
      .getClient()
      .subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    await db.organizationBillingSubscription.updateMany({
      where: { id: subscription.id, organizationId: params.organizationId },
      data: {
        stripeStatus: updated.status,
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        canceledAt: null,
      },
    });
    await writeBillingAudit({
      organizationId: params.organizationId,
      eventType: 'admin_subscription_resumed',
      skuKey: subscription.skuKey,
      metadata: {
        adminUserId: params.adminUserId,
        subscriptionId: subscription.id,
        note: params.note,
      },
    });
    return this.adminBilling.getStatus(params.organizationId);
  }

  async createPaymentLink(params: {
    organizationId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    validateBillingRedirectUrl(params.successUrl);
    validateBillingRedirectUrl(params.cancelUrl);
    return this.billingService.createSetupSession(params);
  }

  async grantCredits(params: {
    organizationId: string;
    adminUserId: string;
    productKey: 'pentest' | 'background_check';
    quantity: number;
    note: string;
    confirm?: string;
  }): Promise<AdminBillingStatus> {
    if (params.quantity >= 25 && params.confirm !== 'grant credits') {
      throw new BadRequestException('Type "grant credits" to confirm.');
    }
    await this.credits.grant({
      organizationId: params.organizationId,
      productKey: params.productKey,
      quantity: params.quantity,
      source: 'manual',
      note: params.note,
      adminUserId: params.adminUserId,
    });
    await writeBillingAudit({
      organizationId: params.organizationId,
      eventType: 'admin_credits_granted',
      metadata: {
        adminUserId: params.adminUserId,
        productKey: params.productKey,
        quantity: params.quantity,
        note: params.note,
      },
    });
    return this.adminBilling.getStatus(params.organizationId);
  }

  async getInvoiceRetryLink(params: {
    organizationId: string;
    adminUserId: string;
    invoiceId: string;
    note: string;
  }) {
    const { billing } = await getOrgBillingContext(params.organizationId);
    if (!billing) throw new NotFoundException('Billing customer not found.');
    const invoice = await this.stripeService
      .getClient()
      .invoices.retrieve(params.invoiceId);
    if (getInvoiceCustomerId(invoice) !== billing.stripeCustomerId) {
      throw new NotFoundException('Invoice not found.');
    }
    await writeBillingAudit({
      organizationId: params.organizationId,
      eventType: 'admin_invoice_retry_link_created',
      metadata: {
        adminUserId: params.adminUserId,
        invoiceId: params.invoiceId,
        note: params.note,
      },
    });
    return {
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
      status: invoice.status ?? 'unknown',
    };
  }

  private async getScopedSubscription(params: {
    organizationId: string;
    subscriptionId: string;
  }) {
    const subscription = await db.organizationBillingSubscription.findFirst({
      where: {
        id: params.subscriptionId,
        organizationId: params.organizationId,
      },
    });
    if (!subscription) throw new NotFoundException('Subscription not found.');
    return subscription;
  }
}
