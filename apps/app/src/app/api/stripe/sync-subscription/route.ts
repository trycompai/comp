import { getServersideSession } from '@/lib/get-session';
import { db } from '@comp/db';
import { NextResponse } from 'next/server';
import { syncStripeDataToKV } from '../syncStripeDataToKv';

export async function POST(req: Request) {
  try {
    const { user } = await getServersideSession(req);
    const { organizationId } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Check if the user has access to the organization
    const member = await db.member.findFirst({
      where: {
        userId: user.id,
        organizationId: organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the organization with Stripe customer ID
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { stripeCustomerId: true },
    });

    if (!organization?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Sync the subscription data
    const result = await syncStripeDataToKV(organization.stripeCustomerId);

    return NextResponse.json({
      success: true,
      subscription: result,
    });
  } catch (error) {
    console.error('[STRIPE SYNC] Error:', error);
    return NextResponse.json({ error: 'Failed to sync subscription data' }, { status: 500 });
  }
}
