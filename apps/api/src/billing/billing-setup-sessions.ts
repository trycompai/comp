import { BadRequestException } from '@nestjs/common';
import { db } from '@db';
import { StripeService } from '../stripe/stripe.service';
import { findOrCreateBillingCustomer } from './billing-customer';
import { validateBillingRedirectUrl } from './billing-redirect-urls';
import { assertStripeBillingConfigured } from './billing-stripe-config';
import { extractStripeId } from './billing-stripe-ids';

export async function createBillingSetupSession(params: {
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  stripeService: StripeService;
}): Promise<{ url: string }> {
  validateBillingRedirectUrl(params.successUrl);
  validateBillingRedirectUrl(params.cancelUrl);
  assertStripeBillingConfigured(params.stripeService);

  const stripe = params.stripeService.getClient();
  const customerId = await findOrCreateBillingCustomer({
    stripeService: params.stripeService,
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
    throw new BadRequestException('Failed to create Stripe Checkout session.');
  }

  return { url: session.url };
}

export async function handleBillingSetupSuccess(params: {
  organizationId: string;
  sessionId: string;
  stripeService: StripeService;
}): Promise<{ success: true }> {
  assertStripeBillingConfigured(params.stripeService);

  const stripe = params.stripeService.getClient();
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
    throw new BadRequestException('Checkout session is missing a setup intent.');
  }

  const paymentMethodId = extractStripeId(setupIntent.payment_method);
  if (!paymentMethodId) {
    throw new BadRequestException('Setup intent is missing a payment method.');
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
