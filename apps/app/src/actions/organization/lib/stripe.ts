import { env } from '@/env.mjs';
import Stripe from 'stripe';

export const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET;

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});
