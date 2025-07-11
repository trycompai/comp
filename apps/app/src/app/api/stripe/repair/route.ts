import { stripe } from '@/actions/organization/lib/stripe';
import { db } from '@comp/db';
import { SubscriptionType } from '@comp/db/types';
import { NextResponse } from 'next/server';
import { syncStripeDataToKV } from '../syncStripeDataToKv';

// Type for request body
interface RepairStripeDataRequest {
  org_id: string;
  stripe_sub_id: string;
}

// Error response helper
function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Success response helper
function successResponse(message: string, data?: any) {
  return new Response(JSON.stringify({ message, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/stripe/repair
 *
 * Repairs Stripe data for an organization by:
 * 1. Retrieving the Stripe subscription
 * 2. Updating the organization with the correct customer ID
 * 3. Syncing the data to KV store
 */
export async function POST(req: Request) {
  // Validate authentication
  const retoolCompApiSecret = process.env.RETOOL_COMP_API_SECRET;
  if (!retoolCompApiSecret) {
    return errorResponse('Server configuration error: retool comp api secret not configured', 500);
  }

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token || token !== retoolCompApiSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  // Parse and validate request body
  let body: RepairStripeDataRequest;
  try {
    body = await req.json();
  } catch (error) {
    return errorResponse('Invalid JSON in request body', 400);
  }

  const { org_id: organizationId, stripe_sub_id: stripeSubscriptionId } = body;

  if (!organizationId) {
    return errorResponse('Missing required field: org_id', 400);
  }

  if (!stripeSubscriptionId) {
    return errorResponse('Missing required field: stripe_sub_id', 400);
  }

  // Fetch organization from database
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    return errorResponse(`Organization not found: ${organizationId}`, 404);
  }

  // Retrieve Stripe subscription
  let subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  } catch (error) {
    return errorResponse(`Stripe subscription not found: ${stripeSubscriptionId}`, 404);
  }

  // Retrieve Stripe customer
  let customer;
  try {
    customer = await stripe.customers.retrieve(subscription.customer as string);
  } catch (error) {
    return errorResponse(`Stripe customer not found: ${subscription.customer}`, 404);
  }

  // Update organization with Stripe data
  const updatedOrganization = await db.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customer.id,
      subscriptionType: SubscriptionType.MANAGED,
    },
  });

  // Sync updated data to KV store
  await syncStripeDataToKV(customer.id);

  return successResponse('Stripe data successfully repaired', {
    organizationId: updatedOrganization.id,
    stripeCustomerId: customer.id,
    subscriptionType: SubscriptionType.MANAGED,
  });
}
