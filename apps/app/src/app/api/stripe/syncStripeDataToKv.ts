import { stripe } from '@/actions/organization/lib/stripe';
import { env } from '@/env.mjs';
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
    let paymentMethodData = null;

    // First try to get payment method from subscription
    if (
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== 'string'
    ) {
      paymentMethodData = {
        brand: subscription.default_payment_method.card?.brand ?? null,
        last4: subscription.default_payment_method.card?.last4 ?? null,
      };
    }

    // If no payment method on subscription and it's a trial, check customer's payment methods
    if (!paymentMethodData && subscription.status === 'trialing') {
      try {
        const customer = await stripe.customers.retrieve(customerId, {
          expand: ['default_source', 'invoice_settings.default_payment_method'],
        });

        if (typeof customer !== 'string' && !customer.deleted) {
          // Check for default payment method on customer
          if (customer.invoice_settings?.default_payment_method) {
            const pmId =
              typeof customer.invoice_settings.default_payment_method === 'string'
                ? customer.invoice_settings.default_payment_method
                : customer.invoice_settings.default_payment_method.id;

            const paymentMethod = await stripe.paymentMethods.retrieve(pmId);
            paymentMethodData = {
              brand: paymentMethod.card?.brand ?? null,
              last4: paymentMethod.card?.last4 ?? null,
            };
          } else {
            // If no default payment method, get the first card from the customer
            const paymentMethods = await stripe.paymentMethods.list({
              customer: customerId,
              type: 'card',
              limit: 1,
            });

            if (paymentMethods.data.length > 0) {
              const pm = paymentMethods.data[0];
              paymentMethodData = {
                brand: pm.card?.brand ?? null,
                last4: pm.card?.last4 ?? null,
              };
              console.log(
                `[STRIPE] Found payment method for trial: ${pm.card?.brand} •••• ${pm.card?.last4}`,
              );
            }
          }
        }
      } catch (error) {
        console.error('[STRIPE] Error fetching customer payment method:', error);
      }
    }

    // If still no payment method found for any subscription status, try listing payment methods
    if (!paymentMethodData) {
      try {
        const paymentMethods = await stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
          limit: 1,
        });

        if (paymentMethods.data.length > 0) {
          const pm = paymentMethods.data[0];
          paymentMethodData = {
            brand: pm.card?.brand ?? null,
            last4: pm.card?.last4 ?? null,
          };
          console.log(`[STRIPE] Found payment method: ${pm.card?.brand} •••• ${pm.card?.last4}`);
        }
      } catch (error) {
        console.error('[STRIPE] Error listing payment methods:', error);
      }
    }

    const subData: STRIPE_SUB_CACHE = {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: firstItem.price?.id ?? null,
      currentPeriodEnd: firstItem.current_period_end ?? null,
      currentPeriodStart: firstItem.current_period_start ?? null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      price: priceDetails,
      product: productDetails,
      paymentMethod: paymentMethodData,
    };

    // Determine subscription type based on price ID
    const starterPriceIds = [
      env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_MONTHLY_PRICE_ID,
      env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_STARTER_YEARLY_PRICE_ID,
    ].filter(Boolean);

    const subscriptionType = starterPriceIds.includes(firstItem.price?.id ?? '')
      ? 'STARTER'
      : 'MANAGED';

    // Update organization with subscription data
    await db.organization.update({
      where: { id: organization.id },
      data: {
        subscriptionType,
        stripeSubscriptionData: subData as any, // Cast for Prisma Json type
      },
    });

    console.log(
      `[STRIPE] Updated org ${organization.id} with ${subscriptionType} subscription status: ${subscription.status}`,
    );
    return subData;
  } catch (error) {
    console.error('[STRIPE] Error syncing subscription data to DB:', error);

    // Return a safe default state on error
    const errorData: STRIPE_SUB_CACHE = { status: 'none' };
    return errorData;
  }
}
