import Stripe from 'stripe';
import { syncStripeDataToKV } from '../syncStripeDataToKv';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/actions/organization/lib/stripe';
import { after } from 'next/server';

const allowedEvents: Stripe.Event.Type[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.upcoming',
  'invoice.marked_uncollectible',
  'invoice.payment_succeeded',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
];

async function processEvent(event: Stripe.Event) {
  // Skip processing if the event isn't one I'm tracking (list of all events below)
  if (!allowedEvents.includes(event.type)) return;

  // All the events I track have a customerId
  const { customer: customerId } = event?.data?.object as {
    customer: string; // Sadly TypeScript does not know this
  };

  // This helps make it typesafe and also lets me know if my assumption is wrong
  if (typeof customerId !== 'string') {
    throw new Error(`[STRIPE HOOK][CANCER] ID isn't string.\nEvent type: ${event.type}`);
  }

  return await syncStripeDataToKV(customerId);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature');

  if (!signature) return NextResponse.json({}, { status: 400 });

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    // Use after() to process the event without blocking the response
    after(async () => {
      try {
        await processEvent(event);
      } catch (error) {
        console.error('[STRIPE HOOK] Error processing event in background', error);
      }
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[STRIPE HOOK] Error constructing event', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
}
