import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, db } from '@db';
import { getBillingSkuByStripePriceId } from '@trycompai/billing';
import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { BillingEntitlementsService } from './billing-entitlements.service';
import {
  claimStripeWebhookEvent,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
} from './stripe-webhook-records';

@Injectable()
export class BillingWebhookService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly entitlements: BillingEntitlementsService,
  ) {}

  async handleWebhook(params: {
    rawBody: Buffer | undefined;
    signature: string | undefined;
  }): Promise<{ ok: true; duplicate?: true }> {
    if (!params.rawBody) throw new BadRequestException('Raw body unavailable.');
    if (!params.signature) {
      throw new BadRequestException('Stripe signature header is missing.');
    }

    const secret =
      process.env.STRIPE_WEBHOOK_SECRET ??
      process.env.STRIPE_PENTEST_WEBHOOK_SECRET;
    if (!secret)
      throw new BadRequestException('Stripe webhook secret is not configured.');

    const stripe = this.stripeService.getClient();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        params.rawBody,
        params.signature,
        secret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }
    const claim = await claimStripeWebhookEvent({
      stripeEventId: event.id,
      eventType: event.type,
      payload: event.data.object as unknown as Prisma.InputJsonValue,
    });
    if (claim.status === 'duplicate') return { ok: true, duplicate: true };

    try {
      await this.processEvent(event);
      await markStripeWebhookProcessed(event.id);
      return { ok: true };
    } catch (error) {
      try {
        await markStripeWebhookFailed({ stripeEventId: event.id, error });
      } catch {
        // Preserve the processing error so Stripe retries for the real failure.
      }
      throw error;
    }
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event);
        return;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.syncSubscriptionFromEvent(event);
        return;
      case 'invoice.paid':
        await this.handleInvoicePaid(event);
        return;
      case 'invoice.payment_failed':
      case 'invoice.payment_action_required':
        await this.handleInvoiceRecoveryEvent(event);
        return;
      default:
        return;
    }
  }

  private async handleCheckoutSessionCompleted(
    event: Stripe.Event,
  ): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription') return;

    const organizationId = session.metadata?.organizationId;
    const customerId = extractStripeId(session.customer);
    if (!organizationId || !customerId) return;

    await db.organizationBilling.upsert({
      where: { organizationId },
      create: { organizationId, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });

    const subscriptionId = extractStripeId(session.subscription);
    if (!subscriptionId) return;
    const subscription = await this.retrieveSubscription(subscriptionId);
    await this.syncCustomerPaymentMethod({
      organizationId,
      customerId,
      subscription,
      stripeEventId: event.id,
    });
    await this.syncSubscriptionItems({
      subscription,
      organizationId,
      stripeEventId: event.id,
    });
  }

  private async syncSubscriptionFromEvent(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const organizationId =
      await this.resolveSubscriptionOrganization(subscription);
    if (!organizationId) return;
    await this.syncSubscriptionItems({
      subscription,
      organizationId,
      stripeEventId: event.id,
    });
  }

  private async handleInvoicePaid(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = extractStripeId(readField(invoice, 'subscription'));
    if (!subscriptionId) return;
    const subscription = await this.retrieveSubscription(subscriptionId);
    const organizationId =
      await this.resolveSubscriptionOrganization(subscription);
    if (!organizationId) return;
    await this.syncSubscriptionItems({
      subscription,
      organizationId,
      stripeEventId: event.id,
    });
  }

  private async handleInvoiceRecoveryEvent(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = extractStripeId(invoice.customer);
    if (!customerId) return;
    const billing = await db.organizationBilling.findFirst({
      where: { stripeCustomerId: customerId },
      select: { organizationId: true },
    });
    if (!billing) return;
    await this.entitlements.writeAuditEvent({
      organizationId: billing.organizationId,
      eventType: event.type,
      stripeEventId: event.id,
      metadata: { invoiceId: invoice.id },
    });
  }

  private async retrieveSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return this.stripeService
      .getClient()
      .subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
  }

  private async syncCustomerPaymentMethod(params: {
    organizationId: string;
    customerId: string;
    subscription: Stripe.Subscription;
    stripeEventId: string;
  }): Promise<void> {
    const subscriptionPaymentMethodId = extractStripeId(
      params.subscription.default_payment_method,
    );
    const customer = await this.stripeService
      .getClient()
      .customers.retrieve(params.customerId);
    if (customer.deleted) return;

    const customerPaymentMethodId = extractStripeId(
      customer.invoice_settings.default_payment_method,
    );
    const paymentMethodId =
      subscriptionPaymentMethodId ?? customerPaymentMethodId;
    if (!paymentMethodId) return;

    await this.stripeService.getClient().customers.update(params.customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    await db.organizationBilling.update({
      where: { organizationId: params.organizationId },
      data: {
        stripePaymentMethodId: paymentMethodId,
        paymentMethodUpdatedAt: new Date(),
      },
    });
    await this.entitlements.writeAuditEvent({
      organizationId: params.organizationId,
      eventType: 'payment_method_updated',
      stripeEventId: params.stripeEventId,
      metadata: { source: 'checkout.session.completed' },
    });
  }

  private async syncSubscriptionItems(params: {
    subscription: Stripe.Subscription;
    organizationId: string;
    stripeEventId: string;
  }): Promise<void> {
    for (const item of params.subscription.items.data) {
      const priceId = item.price.id;
      const sku = getBillingSkuByStripePriceId({ stripePriceId: priceId });
      if (!sku?.includedUsage) continue;
      await this.entitlements.syncSubscriptionItem({
        organizationId: params.organizationId,
        skuKey: sku.key,
        stripeSubscriptionId: params.subscription.id,
        stripeSubscriptionItemId: item.id,
        stripePriceId: priceId,
        stripeStatus: params.subscription.status,
        currentPeriodStart: dateFromSeconds(
          readNumber(item, 'current_period_start'),
        ),
        currentPeriodEnd: dateFromSeconds(
          readNumber(item, 'current_period_end'),
        ),
        includedQuantity: sku.includedUsage.quantity,
        cancelAtPeriodEnd: params.subscription.cancel_at_period_end,
        canceledAt: dateFromSeconds(params.subscription.canceled_at),
        stripeEventId: params.stripeEventId,
      });
    }
  }

  private async resolveSubscriptionOrganization(
    subscription: Stripe.Subscription,
  ): Promise<string | null> {
    if (subscription.metadata?.organizationId) {
      return subscription.metadata.organizationId;
    }
    const customerId = extractStripeId(subscription.customer);
    if (!customerId) return null;
    const billing = await db.organizationBilling.findFirst({
      where: { stripeCustomerId: customerId },
      select: { organizationId: true },
    });
    return billing?.organizationId ?? null;
  }
}

function extractStripeId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return null;
  return typeof value.id === 'string' ? value.id : null;
}

function dateFromSeconds(value: number | null): Date | null {
  return value === null ? null : new Date(value * 1000);
}

function readNumber(value: unknown, key: string): number | null {
  if (!isRecord(value)) return null;
  const raw = value[key];
  return typeof raw === 'number' ? raw : null;
}

function readField(value: unknown, key: string): unknown {
  if (!isRecord(value)) return null;
  return value[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
