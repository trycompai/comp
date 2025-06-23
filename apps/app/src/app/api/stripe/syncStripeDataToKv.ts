import { stripe } from '@/actions/organization/lib/stripe';
import { db } from '@comp/db';
import { Prisma } from '@comp/db/types';
import { STRIPE_SUB_CACHE } from './stripeDataToKv.type';

/**
 * Syncs Stripe subscription data to the database.
 * This is called by webhooks when subscription status changes.
 */
export async function syncStripeDataToKV(customerId: string): Promise<STRIPE_SUB_CACHE> {
  try {
    // Find organization by Stripe customer ID
    const organization = await db.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!organization) {
      console.error(`[STRIPE] No organization found for customer ${customerId}`);
      return { status: 'none' };
    }

    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      // No subscription - update organization
      await db.organization.update({
        where: { id: organization.id },
        data: {
          subscriptionType: 'NONE',
          stripeSubscriptionData: Prisma.JsonNull,
        },
      });

      const subData: STRIPE_SUB_CACHE = { status: 'none' };
      return subData;
    }

    // If a user can have multiple subscriptions, that's your problem
    const subscription = subscriptions.data[0];

    // Handle cases where subscription items might be missing or malformed
    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      console.error('[STRIPE] Subscription has no items:', subscription.id);
      const subData: STRIPE_SUB_CACHE = { status: 'none' };
      await db.organization.update({
        where: { id: organization.id },
        data: {
          subscriptionType: 'NONE',
          stripeSubscriptionData: Prisma.JsonNull,
        },
      });
      return subData;
    }

    const priceId = firstItem.price?.id;
    let priceDetails = null;
    let productDetails = null;

    if (priceId) {
      try {
        const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
        if (price.product && typeof price.product === 'object' && !price.product.deleted) {
          priceDetails = {
            nickname: price.nickname,
            unit_amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval ?? null,
          };
          productDetails = {
            name: price.product.name,
          };
        }
      } catch (priceError) {
        console.error(`[STRIPE] Failed to retrieve price ${priceId} or its product:`, priceError);
      }
    }

    // Build subscription data
    const subData: STRIPE_SUB_CACHE = {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: firstItem.price?.id ?? null,
      currentPeriodEnd: firstItem.current_period_end ?? null,
      currentPeriodStart: firstItem.current_period_start ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      price: priceDetails,
      product: productDetails,
      paymentMethod:
        subscription.default_payment_method &&
        typeof subscription.default_payment_method !== 'string'
          ? {
              brand: subscription.default_payment_method.card?.brand ?? null,
              last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : null,
    };

    // Update organization with subscription data
    await db.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionType: 'STRIPE',
        stripeSubscriptionData: subData as any, // Cast for Prisma Json type
      },
    });

    console.log(
      `[STRIPE] Updated org ${organization.id} with subscription status: ${subscription.status}`,
    );
    return subData;
  } catch (error) {
    console.error('[STRIPE] Error syncing subscription data to DB:', error);

    // Return a safe default state on error
    const errorData: STRIPE_SUB_CACHE = { status: 'none' };
    return errorData;
  }
}
