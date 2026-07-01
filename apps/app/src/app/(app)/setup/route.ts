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

  // Invite flows take precedence over the CS-569 offboard guard: a raw
  // ?inviteCode= is turned into /invite/{code} downstream by /setup/[setupId],
  // so let it flow through untouched rather than pre-empting it here.
  const hasInviteCode = request.nextUrl.searchParams.has('inviteCode');
  if (!hasInviteCode) {
    // CS-569: guard the onboarding loop at the setup entry too (direct nav or
    // the create-additional intent). A user with 0 active memberships but >=1
    // deactivated one was offboarded — never let them create a (spurious) org.
    // New users (no memberships) and users adding an additional org (have
    // active memberships) fall through unchanged.
    const meRes = await serverApi.get<{
      organizations: unknown[];
      pendingInvitation: { id: string } | null;
      hasInactiveMembership?: boolean;
    }>('/v1/auth/me');
    const activeOrgCount = meRes.data?.organizations?.length ?? 0;
    if (activeOrgCount === 0 && meRes.data?.hasInactiveMembership) {
      // A pending invitation is the offboarded user's legitimate way back in —
      // honor it before the access-removed dead-end (mirrors the root page).
      if (meRes.data?.pendingInvitation) {
        redirect(`/invite/${meRes.data.pendingInvitation.id}`);
      }
      redirect('/auth/access-removed');
    }
  }

  const setupSession = await createSetupSession(session.user.id);
  redirect(`/setup/${setupSession.id}${queryString}`);
}
