'use server';

import { stripe } from '@/actions/organization/lib/stripe';
import { authWithOrgAccessClient } from '@/actions/safe-action';
import { getSubscriptionData } from '@/app/api/stripe/getSubscriptionData';
import { syncStripeDataToKV } from '@/app/api/stripe/syncStripeDataToKv';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const cancelSubscriptionSchema = z.object({
  organizationId: z.string(),
  immediate: z.boolean().optional().default(false), // If true, cancel immediately. If false, cancel at period end
});

export const cancelSubscriptionAction = authWithOrgAccessClient
  .inputSchema(cancelSubscriptionSchema)
  .metadata({
    name: 'cancel-subscription',
    track: {
      event: 'cancel-subscription',
      description: 'Cancel Stripe subscription',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, immediate } = parsedInput;

    try {
      // Get current subscription data
      const subscriptionData = await getSubscriptionData(organizationId);

      if (subscriptionData.status === 'none') {
        throw new Error('No active subscription found');
      }

      if (!('subscriptionId' in subscriptionData) || !subscriptionData.subscriptionId) {
        throw new Error('Invalid subscription data');
      }

      // Cancel the subscription
      const updatedSubscription = await stripe.subscriptions.update(
        subscriptionData.subscriptionId,
        {
          cancel_at_period_end: !immediate,
          // If immediate cancellation, use cancel method instead
        },
      );

      // If immediate cancellation requested, cancel now
      if (immediate) {
        await stripe.subscriptions.cancel(subscriptionData.subscriptionId);
      }

      // Get the organization's Stripe customer ID
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { stripeCustomerId: true },
      });

      if (organization?.stripeCustomerId) {
        // Sync the updated subscription data to the database
        await syncStripeDataToKV(organization.stripeCustomerId);
      }

      // Revalidate the current path
      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');

      revalidatePath(path);
      // Also specifically revalidate the billing page
      revalidatePath(`/${organizationId}/settings/billing`);

      return {
        success: true,
        cancelAtPeriodEnd: !immediate,
        message: immediate
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the current period',
      };
    } catch (error) {
      console.error('[STRIPE] Error canceling subscription:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to cancel subscription');
    }
  });
