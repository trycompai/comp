import { stripe } from '@/actions/organization/lib/stripe';
import { client } from '@comp/kv';
import { STRIPE_SUB_CACHE } from './stripeDataToKv.type';

// The contents of this function should probably be wrapped in a try/catch
export async function syncStripeDataToKV(customerId: string): Promise<STRIPE_SUB_CACHE> {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      const subData: STRIPE_SUB_CACHE = { status: 'none' };
      await client.set(`stripe:customer:${customerId}`, subData);
      return subData;
    }

    // If a user can have multiple subscriptions, that's your problem
    const subscription = subscriptions.data[0];

    // Handle cases where subscription items might be missing or malformed
    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      console.error('[STRIPE] Subscription has no items:', subscription.id);
      const subData: STRIPE_SUB_CACHE = { status: 'none' };
      await client.set(`stripe:customer:${customerId}`, subData);
      return subData;
    }

    // Store complete subscription state
    const subData: STRIPE_SUB_CACHE = {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: firstItem.price?.id ?? null,
      currentPeriodEnd: firstItem.current_period_end ?? null,
      currentPeriodStart: firstItem.current_period_start ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      paymentMethod:
        subscription.default_payment_method &&
        typeof subscription.default_payment_method !== 'string'
          ? {
              brand: subscription.default_payment_method.card?.brand ?? null,
              last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : null,
    };

    // Store the data in your KV
    await client.set(`stripe:customer:${customerId}`, subData);
    return subData;
  } catch (error) {
    console.error('[STRIPE] Error syncing subscription data to KV:', error);

    // Return a safe default state on error
    const errorData: STRIPE_SUB_CACHE = { status: 'none' };

    // Still try to cache the error state to prevent repeated failed API calls
    try {
      await client.set(`stripe:customer:${customerId}`, errorData, {
        ex: 300, // Expire after 5 minutes to allow retry
      });
    } catch (cacheError) {
      console.error('[STRIPE] Error caching error state:', cacheError);
    }

    return errorData;
  }
}
