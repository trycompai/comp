'use server';

import { env } from '@/env.mjs';
import { stripe } from '@/lib/stripe';
import { db } from '@db';

export async function subscribeToPentestPlan(
  orgId: string,
  returnBaseUrl: string,
): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  const priceId = env.STRIPE_PENTEST_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    throw new Error('STRIPE_PENTEST_SUBSCRIPTION_PRICE_ID is not configured.');
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { website: true, name: true },
  });

  let customerId: string | undefined;

  if (org?.website) {
    const { findStripeCustomerByDomain, extractDomain } = await import('@/lib/stripe');
    const domain = extractDomain(org.website);
    if (domain) {
      const existing = await findStripeCustomerByDomain(domain);
      if (existing) {
        customerId = existing.customerId;
      }
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org?.name ?? undefined,
      metadata: { organizationId: orgId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnBaseUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnBaseUrl}/subscription`,
  });

  if (!session.url) {
    throw new Error('Failed to create Stripe Checkout session URL.');
  }

  return { url: session.url };
}

export async function handleSubscriptionSuccess(
  orgId: string,
  sessionId: string,
): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });

  const subscription = session.subscription;
  if (!subscription || typeof subscription === 'string') {
    throw new Error('Subscription not found in session.');
  }

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? '';

  const item = subscription.items.data[0];
  const stripePriceId = item?.price.id ?? '';
  const stripeSubscriptionId = subscription.id;
  const status = subscription.status === 'active' ? 'active' : subscription.status;
  // In Stripe SDK v20+ (API 2025-12-15.clover), period dates moved to SubscriptionItem
  const currentPeriodStart = new Date((item?.current_period_start ?? 0) * 1000);
  const currentPeriodEnd = new Date((item?.current_period_end ?? 0) * 1000);

  await db.pentestSubscription.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
    },
    update: {
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
    },
  });
}

export async function checkAndChargePentestBilling(orgId: string): Promise<void> {
  const subscription = await db.pentestSubscription.findUnique({
    where: { organizationId: orgId },
  });

  if (!subscription) {
    throw new Error(
      `No active pentest subscription. Subscribe at /security/penetration-tests/subscription.`,
    );
  }

  if (subscription.status !== 'active') {
    throw new Error('Pentest subscription is not active.');
  }

  const runsThisPeriod = await db.securityPenetrationTestRun.count({
    where: {
      organizationId: orgId,
      createdAt: {
        gte: subscription.currentPeriodStart,
        lte: subscription.currentPeriodEnd,
      },
    },
  });

  if (runsThisPeriod < subscription.includedRunsPerPeriod) {
    return;
  }

  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  const overagePriceId = env.STRIPE_PENTEST_OVERAGE_PRICE_ID;
  if (!overagePriceId) {
    throw new Error('STRIPE_PENTEST_OVERAGE_PRICE_ID is not configured.');
  }

  const price = await stripe.prices.retrieve(overagePriceId);
  const amount = price.unit_amount;
  if (!amount) {
    throw new Error('Overage price has no unit amount.');
  }

  const customer = await stripe.customers.retrieve(subscription.stripeCustomerId, {
    expand: ['invoice_settings.default_payment_method'],
  });

  if (customer.deleted) {
    throw new Error('Stripe customer not found.');
  }

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
  if (!defaultPaymentMethod) {
    throw new Error('No payment method on file. Update billing at /subscription.');
  }

  const paymentMethodId =
    typeof defaultPaymentMethod === 'string'
      ? defaultPaymentMethod
      : defaultPaymentMethod.id;

  const paymentIntent = await stripe.paymentIntents.create({
    customer: subscription.stripeCustomerId,
    amount,
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'never',
    },
  });

  if (paymentIntent.status !== 'succeeded') {
    throw new Error('Overage payment failed. Check billing.');
  }
}
