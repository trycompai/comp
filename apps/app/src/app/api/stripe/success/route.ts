import { getServersideSession } from '@/lib/get-session';
import { trackPurchaseCompletionServer } from '@/utils/server-tracking';
import { db } from '@comp/db';
import { client } from '@comp/kv';
import { redirect } from 'next/navigation';
import { syncStripeDataToKV } from '../syncStripeDataToKv';

export async function GET(req: Request) {
  const { user } = await getServersideSession(req);

  // Extract organizationId and planType from query parameters
  const url = new URL(req.url);
  const organizationId = url.searchParams.get('organizationId');
  const planType = url.searchParams.get('planType') || 'done-for-you'; // Default to done-for-you for backwards compatibility

  if (!organizationId) {
    return redirect('/');
  }

  // Check if the user has access to the organization by querying the members table
  const member = await db.member.findFirst({
    where: {
      userId: user.id,
      organizationId: organizationId,
    },
  });

  if (!member) {
    return redirect('/');
  }

  const stripeCustomerId = await client.get(`stripe:organization:${organizationId}`);
  if (!stripeCustomerId) {
    return redirect(`/${organizationId}`);
  }

  await syncStripeDataToKV(stripeCustomerId as string);

  // Get subscription value for tracking (you may need to fetch this from Stripe or your DB)
  // For now, using default values based on plan type
  const value = planType === 'starter' ? 99 : 997;

  // Track the successful purchase with user ID
  await trackPurchaseCompletionServer(organizationId, planType, value, user.id);

  // Redirect with enhanced parameters for client-side tracking
  const redirectUrl = new URL(`/${organizationId}/frameworks`, url.origin);
  redirectUrl.searchParams.set('checkoutComplete', planType);
  redirectUrl.searchParams.set('organizationId', organizationId);
  redirectUrl.searchParams.set('value', value.toString());

  return redirect(redirectUrl.toString());
}
