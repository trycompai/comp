import { serverApi } from '@/lib/api-server';
import { resolveNoActiveOrgRedirect } from '@/lib/no-active-org-redirect';
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
  // so let it flow through untouched rather than pre-empting it here. Matches
  // the downstream truthy check (an empty ?inviteCode= is not an invite).
  const inviteCode = request.nextUrl.searchParams.get('inviteCode');
  if (!inviteCode) {
    // CS-569: guard the onboarding loop at the setup entry too (direct nav or
    // the create-additional intent). Reuse the same decision the landing page
    // uses so the two can't drift. A non-null target means the user is invited
    // or offboarded; `null` means a new user (or one with active orgs) who
    // should fall through to onboarding.
    const meRes = await serverApi.get<{
      organizations: unknown[];
      pendingInvitation: { id: string } | null;
      hasInactiveMembership?: boolean;
    }>('/v1/auth/me');
    const hasActiveOrg = (meRes.data?.organizations?.length ?? 0) > 0;
    if (!hasActiveOrg) {
      const target = resolveNoActiveOrgRedirect(meRes.data);
      if (target) {
        redirect(target);
      }
    }
  }

  const setupSession = await createSetupSession(session.user.id);
  redirect(`/setup/${setupSession.id}${queryString}`);
}
