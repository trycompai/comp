'use server';

import { stripe } from '@/actions/organization/lib/stripe';
import { authWithOrgAccessClient } from '@/actions/safe-action';
import { db } from '@comp/db';
import { client } from '@comp/kv';
import type { Stripe } from 'stripe';
import { z } from 'zod';

/**
 * Zod schema for Stripe checkout session generation.
 *
 * Important: According to Stripe's API:
 * - success_url is REQUIRED for standard checkout sessions
 * - cancel_url is OPTIONAL (Stripe will use success_url if not provided)
 * - line_items with recurring price is REQUIRED for subscription mode
 *
 * We provide sensible defaults to ensure the action always works.
 */
const generateCheckoutSessionSchema = z
  .object({
    organizationId: z.string(),
    mode: z.enum(['payment', 'subscription']),
    priceId: z.string(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
    allowPromotionCodes: z.boolean().optional(),
    metadata: z.record(z.string()).optional(),
  })
  .refine(
    // Ensure priceId is provided for subscription mode
    (data) => {
      if (data.mode === 'subscription' && !data.priceId) {
        return false;
      }
      return true;
    },
    {
      message: "priceId is required when mode is 'subscription'",
      path: ['priceId'],
    },
  );

export const generateCheckoutSessionAction = authWithOrgAccessClient
  .inputSchema(generateCheckoutSessionSchema)
  .metadata({
    name: 'generate-checkout-session',
    track: {
      event: 'generate-checkout-session',
      description: 'Generate Stripe checkout session',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { user, member, organizationId } = ctx;
    const {
      successUrl,
      cancelUrl,
      mode,
      priceId,
      allowPromotionCodes = false,
      metadata,
    } = parsedInput;

    let stripeCustomerId;

    // First, check the KV store for the stripeCustomerId
    stripeCustomerId = await client.get(`stripe:organization:${organizationId}`);

    // If not present in KV, check the database for the organization and stripeCustomerId
    if (!stripeCustomerId) {
      const organization = await db.organization.findUnique({
        where: {
          id: organizationId,
        },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      if (organization.stripeCustomerId) {
        stripeCustomerId = organization.stripeCustomerId;
        // Sync the stripeCustomerId to KV store since it was missing there
        await client.set(`stripe:organization:${organizationId}`, stripeCustomerId);
      }
    }

    // Create a new Stripe customer if this organization doesn't have one
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          organizationId,
          userId: user.id,
        },
      });

      // Store the relation between organizationId and stripeCustomerId in your KV & database
      await client.set(`stripe:organization:${organizationId}`, newCustomer.id);
      await db.organization.update({
        where: {
          id: organizationId,
        },
        data: {
          stripeCustomerId: newCustomer.id,
        },
      });
      stripeCustomerId = newCustomer.id;
    }

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      ...(allowPromotionCodes && { allow_promotion_codes: true }),
      metadata: {
        organizationId,
        userId: user.id,
        memberId: member.id,
        dubCustomerId: user.id,
        ...metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_update: {
        address: 'auto',
      },
      ...(stripeCustomerId && { customer: stripeCustomerId as string }),
      ...(mode === 'subscription' && {
        subscription_data: {
          metadata: {
            organizationId,
            userId: user.id,
          },
        },
      }),
    };

    const checkout = await stripe.checkout.sessions.create(sessionData);

    return {
      success: true,
      checkoutUrl: checkout.url,
      sessionId: checkout.id,
    };
  });
