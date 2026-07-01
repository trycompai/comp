import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { createSetupSession } from './lib/setup-session';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get search params from the request
  const searchParams = request.nextUrl.searchParams.toString();
  const queryString = searchParams ? `?${searchParams}` : '';

  if (!session?.user?.id) {
    redirect(`/sign-in${queryString}`);
  }

  // CS-569: guard the onboarding loop at the setup entry too (direct nav or the
  // create-additional intent). A user with 0 active memberships but >=1
  // deactivated one was offboarded — never let them create a (spurious) org.
  // New users (no memberships) and users adding an additional org (have active
  // memberships) fall through unchanged.
  const meRes = await serverApi.get<{
    organizations: unknown[];
    hasInactiveMembership?: boolean;
  }>('/v1/auth/me');
  const activeOrgCount = meRes.data?.organizations?.length ?? 0;
  if (activeOrgCount === 0 && meRes.data?.hasInactiveMembership) {
    redirect('/auth/access-removed');
  }

  const setupSession = await createSetupSession(session.user.id);
  redirect(`/setup/${setupSession.id}${queryString}`);
}
