'use server';

import { stripe } from '@/actions/organization/lib/stripe';
import { authWithOrgAccessClient } from '@/actions/safe-action';
import { db } from '@comp/db';
import { client } from '@comp/kv';
import { z } from 'zod';

const createPortalSessionSchema = z.object({
  organizationId: z.string(),
  returnUrl: z.string().url().optional(),
});

export const createPortalSessionAction = authWithOrgAccessClient
  .inputSchema(createPortalSessionSchema)
  .metadata({
    name: 'create-portal-session',
    track: {
      event: 'create-portal-session',
      description: 'Create Stripe customer portal session',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, returnUrl } = parsedInput;

    try {
      // Get the Stripe customer ID
      let stripeCustomerId = await client.get(`stripe:organization:${organizationId}`);

      // If not in KV, check database
      if (!stripeCustomerId) {
        const organization = await db.organization.findUnique({
          where: {
            id: organizationId,
          },
          select: {
            stripeCustomerId: true,
          },
        });

        if (!organization?.stripeCustomerId) {
          throw new Error('No Stripe customer found for this organization');
        }

        stripeCustomerId = organization.stripeCustomerId;

        // Cache it for next time
        await client.set(`stripe:organization:${organizationId}`, stripeCustomerId);
      }

      // Ensure we have a valid base URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const defaultReturnUrl = `${appUrl}/${organizationId}/settings/billing`;

      // Create the portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId as string,
        return_url: returnUrl || defaultReturnUrl,
      });

      return {
        success: true,
        portalUrl: portalSession.url,
      };
    } catch (error) {
      console.error('[STRIPE] Error creating portal session:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create portal session');
    }
  });
