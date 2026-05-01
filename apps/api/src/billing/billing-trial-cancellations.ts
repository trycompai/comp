import Stripe from 'stripe';
import { BillingEntitlementsService } from './billing-entitlements.service';
import { StripeService } from '../stripe/stripe.service';

export async function cancelTrialAtPeriodEndImmediately(params: {
  stripeService: StripeService;
  entitlements: BillingEntitlementsService;
  subscription: Stripe.Subscription;
  organizationId: string;
  stripeEventId: string;
}): Promise<Stripe.Subscription> {
  if (
    params.subscription.status !== 'trialing' ||
    !params.subscription.cancel_at_period_end
  ) {
    return params.subscription;
  }

  const stripe = params.stripeService.getClient();
  let canceledSubscription: Stripe.Subscription;
  try {
    canceledSubscription = await stripe.subscriptions.cancel(
      params.subscription.id,
      {
        cancellation_details: {
          comment:
            'Trial cancellation takes effect immediately to revoke unused included usage.',
        },
      },
    );
  } catch (error) {
    const latestSubscription = await stripe.subscriptions.retrieve(
      params.subscription.id,
      { expand: ['items.data.price'] },
    );
    if (latestSubscription.status !== 'canceled') {
      throw error;
    }
    canceledSubscription = latestSubscription;
  }

  await params.entitlements.writeAuditEvent({
    organizationId: params.organizationId,
    eventType: 'trial_subscription_canceled_immediately',
    stripeEventId: params.stripeEventId,
    metadata: { stripeSubscriptionId: params.subscription.id },
  });

  return canceledSubscription;
}
