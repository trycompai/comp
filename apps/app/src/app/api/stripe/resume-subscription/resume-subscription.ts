'use server';

import { stripe } from '@/actions/organization/lib/stripe';
import { authWithOrgAccessClient } from '@/actions/safe-action';
import { getSubscriptionData } from '@/app/api/stripe/getSubscriptionData';
import { syncStripeDataToKV } from '@/app/api/stripe/syncStripeDataToKv';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const resumeSubscriptionSchema = z.object({
  organizationId: z.string(),
});

export const resumeSubscriptionAction = authWithOrgAccessClient
  .inputSchema(resumeSubscriptionSchema)
  .metadata({
    name: 'resume-subscription',
    track: {
      event: 'resume-subscription',
      description: 'Resume a cancelled Stripe subscription',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = parsedInput;

    try {
      // Get current subscription data
      const subscriptionData = await getSubscriptionData(organizationId);

      if (subscriptionData.status === 'none') {
        throw new Error('No subscription found');
      }

      if (!('subscriptionId' in subscriptionData) || !subscriptionData.subscriptionId) {
        throw new Error('Invalid subscription data');
      }

      if (!subscriptionData.cancelAtPeriodEnd) {
        throw new Error('Subscription is not scheduled for cancellation');
      }

      // Resume the subscription by updating cancel_at_period_end to false
      await stripe.subscriptions.update(subscriptionData.subscriptionId, {
        cancel_at_period_end: false,
      });

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
        message:
          'Your subscription has been reactivated and will continue after the current period',
      };
    } catch (error) {
      console.error('[STRIPE] Error resuming subscription:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to resume subscription');
    }
  });
