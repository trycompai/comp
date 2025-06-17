import { getServersideSession } from '@/lib/get-session';
import { db } from '@comp/db';
import { client } from '@comp/kv';
import { redirect } from 'next/navigation';
import { syncStripeDataToKV } from '../syncStripeDataToKv';

export async function GET(req: Request) {
  const { user } = await getServersideSession(req);

  // Extract organizationId from query parameters
  const url = new URL(req.url);
  const organizationId = url.searchParams.get('organizationId');

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
    return redirect('/');
  }

  await syncStripeDataToKV(stripeCustomerId as string);
  return redirect('/');
}
