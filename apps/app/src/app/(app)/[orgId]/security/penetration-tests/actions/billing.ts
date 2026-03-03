'use server';

import { auth } from '@/utils/auth';
import { env } from '@/env.mjs';
import { stripe } from '@/lib/stripe';
import { db } from '@db';
import { headers } from 'next/headers';

async function requireOrgMember(orgId: string): Promise<void> {
  const response = await auth.api.getSession({ headers: await headers() });
  if (!response?.session) {
    throw new Error('Unauthorized');
  }
  if (response.session.activeOrganizationId !== orgId) {
    throw new Error('Unauthorized');
  }
}

export async function subscribeToPentestPlan(
  orgId: string,
  returnBaseUrl: string,
): Promise<{ url: string }> {
  await requireOrgMember(orgId);

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

  // Check for existing OrganizationBilling record first
  let customerId: string | undefined;
  const existingBilling = await db.organizationBilling.findUnique({
    where: { organizationId: orgId },
  });

  if (existingBilling) {
    customerId = existingBilling.stripeCustomerId;
  } else if (org?.website) {
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

  // Upsert OrganizationBilling with resolved customer ID
  await db.organizationBilling.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      stripeCustomerId: customerId,
    },
    update: {
      stripeCustomerId: customerId,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnBaseUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnBaseUrl,
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
  await requireOrgMember(orgId);

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

  // Validate the session belongs to this org by checking against any existing billing record
  const existingBilling = await db.organizationBilling.findUnique({
    where: { organizationId: orgId },
  });
  if (existingBilling && existingBilling.stripeCustomerId !== stripeCustomerId) {
    throw new Error('Checkout session does not belong to this organization.');
  }

  const item = subscription.items.data[0];
  const stripePriceId = item?.price.id ?? '';
  const stripeSubscriptionId = subscription.id;
  const status = subscription.status === 'active' ? 'active' : subscription.status;
  // In Stripe SDK v20+ (API 2025-12-15.clover), period dates moved to SubscriptionItem
  const currentPeriodStart = new Date((item?.current_period_start ?? 0) * 1000);
  const currentPeriodEnd = new Date((item?.current_period_end ?? 0) * 1000);

  // Upsert OrganizationBilling to get the billing ID
  const billing = await db.organizationBilling.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      stripeCustomerId,
    },
    update: {
      stripeCustomerId,
    },
  });

  await db.pentestSubscription.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      organizationBillingId: billing.id,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
    },
    update: {
      organizationBillingId: billing.id,
      stripeSubscriptionId,
      stripePriceId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
    },
  });
}

export async function createBillingPortalSession(
  orgId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  await requireOrgMember(orgId);

  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  const billing = await db.organizationBilling.findUnique({
    where: { organizationId: orgId },
  });

  if (!billing) {
    throw new Error('No billing record found for this organization.');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: billing.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: portalSession.url };
}

export async function checkAndChargePentestBilling(orgId: string): Promise<void> {
  await requireOrgMember(orgId);

  const subscription = await db.pentestSubscription.findUnique({
    where: { organizationId: orgId },
    include: { organizationBilling: true },
  });

  if (!subscription) {
    throw new Error(
      `No active pentest subscription. Subscribe at /settings/billing.`,
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

  if (runsThisPeriod <= subscription.includedRunsPerPeriod) {
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

  const stripeCustomerId = subscription.organizationBilling.stripeCustomerId;

  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand: ['invoice_settings.default_payment_method'],
  });

  if (customer.deleted) {
    throw new Error('Stripe customer not found.');
  }

  const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;
  if (!defaultPaymentMethod) {
    throw new Error('No payment method on file. Update billing at /settings/billing.');
  }

  const paymentMethodId =
    typeof defaultPaymentMethod === 'string'
      ? defaultPaymentMethod
      : defaultPaymentMethod.id;

  const paymentIntent = await stripe.paymentIntents.create({
    customer: stripeCustomerId,
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
