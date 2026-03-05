'use server';

import { auth } from '@/utils/auth';
import { env } from '@/env.mjs';
import { stripe } from '@/lib/stripe';
import { db } from '@db';
import { headers } from 'next/headers';

async function requireOrgAdmin(orgId: string): Promise<void> {
  const response = await auth.api.getSession({ headers: await headers() });
  if (!response?.session) {
    throw new Error('Unauthorized');
  }
  if (response.session.activeOrganizationId !== orgId) {
    throw new Error('Unauthorized');
  }

  const userId = (response as { user?: { id?: string } }).user?.id;
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Verify user is an admin or owner — billing actions should not be available to regular members
  const member = await db.member.findFirst({
    where: {
      userId,
      organizationId: orgId,
      deactivated: false,
      role: { in: ['admin', 'owner'] },
    },
  });

  if (!member) {
    throw new Error('Billing actions require admin or owner role.');
  }
}

async function getOrgBillingUrl(orgId: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const origin = env.NEXT_PUBLIC_BETTER_AUTH_URL ?? `${proto}://${host}`;
  return `${origin}/${orgId}/settings/billing`;
}

export async function subscribeToPentestPlan(
  orgId: string,
): Promise<{ url: string }> {
  await requireOrgAdmin(orgId);
  const returnBaseUrl = await getOrgBillingUrl(orgId);

  if (!stripe) {
    throw new Error('Stripe is not configured.');
  }

  // Guard against creating duplicate subscriptions
  const existingSub = await db.pentestSubscription.findUnique({
    where: { organizationId: orgId },
  });
  if (existingSub?.status === 'active') {
    throw new Error('Organization already has an active pentest subscription.');
  }

  const priceId = env.STRIPE_PENTEST_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    throw new Error('STRIPE_PENTEST_SUBSCRIPTION_PRICE_ID is not configured.');
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { website: true, name: true },
  });

  // Reuse existing Stripe customer if billing record already exists
  let customerId: string | undefined;
  const existingBilling = await db.organizationBilling.findUnique({
    where: { organizationId: orgId },
  });

  if (existingBilling) {
    customerId = existingBilling.stripeCustomerId;
  } else {
    // Always create a new customer — never infer ownership from domain matching
    // since organization.website is tenant-controlled and unverified.
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
  await requireOrgAdmin(orgId);

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

  // Validate the session belongs to this org.
  // subscribeToPentestPlan always upserts OrganizationBilling before creating the
  // checkout session, so a billing row should always exist here. If it doesn't,
  // verify ownership via the Stripe customer's metadata as a fallback.
  const existingBilling = await db.organizationBilling.findUnique({
    where: { organizationId: orgId },
  });
  if (existingBilling) {
    if (existingBilling.stripeCustomerId !== stripeCustomerId) {
      throw new Error('Checkout session does not belong to this organization.');
    }
  } else {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (
      customer.deleted ||
      customer.metadata?.organizationId !== orgId
    ) {
      throw new Error('Checkout session does not belong to this organization.');
    }
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
): Promise<{ url: string }> {
  await requireOrgAdmin(orgId);
  const returnUrl = await getOrgBillingUrl(orgId);

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

export interface PreauthorizeResult {
  authorized: boolean;
  isOverage: boolean;
  error?: string;
}

export interface PentestPricing {
  subscriptionPrice: string; // e.g. "$99/mo"
  overagePrice: string;      // e.g. "$199"
}

export async function preauthorizePentestRun(
  orgId: string,
  nonce: string,
): Promise<PreauthorizeResult> {
  await requireOrgAdmin(orgId);

  const subscription = await db.pentestSubscription.findUnique({
    where: { organizationId: orgId },
    include: { organizationBilling: true },
  });

  if (!subscription) {
    return { authorized: false, isOverage: false, error: 'No active pentest subscription. Subscribe at /settings/billing.' };
  }

  if (subscription.status !== 'active') {
    return { authorized: false, isOverage: false, error: 'Pentest subscription is not active.' };
  }

  const runsThisPeriod = await db.securityPenetrationTestRun.count({
    where: {
      organizationId: orgId,
      createdAt: {
        gte: subscription.currentPeriodStart,
        lt: subscription.currentPeriodEnd,
      },
    },
  });

  if (runsThisPeriod < subscription.includedRunsPerPeriod) {
    return { authorized: true, isOverage: false };
  }

  // Over limit — charge overage
  if (!stripe) {
    return { authorized: false, isOverage: true, error: 'Stripe is not configured.' };
  }

  const overagePriceId = env.STRIPE_PENTEST_OVERAGE_PRICE_ID;
  if (!overagePriceId) {
    return { authorized: false, isOverage: true, error: 'STRIPE_PENTEST_OVERAGE_PRICE_ID is not configured.' };
  }

  const price = await stripe.prices.retrieve(overagePriceId);
  const amount = price.unit_amount;
  if (!amount) {
    return { authorized: false, isOverage: true, error: 'Overage price has no unit amount.' };
  }

  const stripeCustomerId = subscription.organizationBilling.stripeCustomerId;

  // Try the subscription's default payment method first (Checkout often sets it here),
  // then fall back to the customer's invoice_settings.default_payment_method.
  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId, {
    expand: ['default_payment_method'],
  });

  let paymentMethodId: string | undefined;

  const subPm = stripeSub.default_payment_method;
  if (subPm) {
    paymentMethodId = typeof subPm === 'string' ? subPm : subPm.id;
  }

  if (!paymentMethodId) {
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ['invoice_settings.default_payment_method'],
    });

    if (customer.deleted) {
      return { authorized: false, isOverage: true, error: 'Stripe customer not found.' };
    }

    const custPm = customer.invoice_settings?.default_payment_method;
    if (custPm) {
      paymentMethodId = typeof custPm === 'string' ? custPm : custPm.id;
    }
  }

  if (!paymentMethodId) {
    return { authorized: false, isOverage: true, error: 'No payment method on file. Update billing at /settings/billing.' };
  }

  const idempotencyKey = `pentest-overage-${orgId}-${nonce}`;

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        customer: stripeCustomerId,
        amount,
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
      },
      { idempotencyKey },
    );

    if (paymentIntent.status !== 'succeeded') {
      return { authorized: false, isOverage: true, error: 'Overage payment failed. Check billing.' };
    }
  } catch {
    return { authorized: false, isOverage: true, error: 'Overage payment failed. Check billing.' };
  }

  return { authorized: true, isOverage: true };
}

function formatStripePrice(unitAmount: number | null, currency: string, interval?: string | null): string {
  const amount = (unitAmount ?? 0) / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  if (interval) {
    const shortInterval = interval === 'month' ? 'mo' : interval === 'year' ? 'yr' : interval;
    return `${formatted}/${shortInterval}`;
  }
  return formatted;
}

export async function getPentestPricing(): Promise<PentestPricing> {
  const fallback: PentestPricing = { subscriptionPrice: '$99/mo', overagePrice: '$199' };

  if (!stripe) return fallback;

  const subPriceId = env.STRIPE_PENTEST_SUBSCRIPTION_PRICE_ID;
  const overagePriceId = env.STRIPE_PENTEST_OVERAGE_PRICE_ID;

  try {
    const [subPrice, overagePrice] = await Promise.all([
      subPriceId ? stripe.prices.retrieve(subPriceId) : null,
      overagePriceId ? stripe.prices.retrieve(overagePriceId) : null,
    ]);

    return {
      subscriptionPrice: subPrice
        ? formatStripePrice(subPrice.unit_amount, subPrice.currency, subPrice.recurring?.interval)
        : fallback.subscriptionPrice,
      overagePrice: overagePrice
        ? formatStripePrice(overagePrice.unit_amount, overagePrice.currency)
        : fallback.overagePrice,
    };
  } catch {
    return fallback;
  }
}
