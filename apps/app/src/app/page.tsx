import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Helper function to build URL with search params
  const buildUrlWithParams = async (path: string): Promise<string> => {
    const params = new URLSearchParams();
    Object.entries(await searchParams).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  if (!session) {
    return redirect(await buildUrlWithParams('/auth'));
  }

  const intent = (await searchParams)?.intent;
  const orgId = session.session.activeOrganizationId;

  if (!orgId) {
    // If the user has no active org, check for pending invitations for this email
    const pendingInvite = await db.invitation.findFirst({
      where: {
        email: session.user.email,
        status: 'pending',
      },
    });

    if (pendingInvite) {
      return redirect(await buildUrlWithParams(`/invite/${pendingInvite.id}`));
    }

    return redirect(await buildUrlWithParams('/setup'));
  }

  // If user is explicitly creating an additional org, go to setup regardless of current org state
  if (intent === 'create-additional') {
    return redirect(await buildUrlWithParams('/setup'));
  }

  // If org exists but hasn't completed onboarding, route to onboarding flow
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { onboardingCompleted: true },
  });
  if (org && org.onboardingCompleted === false) {
    return redirect(await buildUrlWithParams(`/onboarding/${orgId}`));
  }

  const member = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
      deactivated: false,
    },
  });

  if (!member) {
    return redirect(await buildUrlWithParams('/setup'));
  }

  return redirect(await buildUrlWithParams(`/${orgId}/frameworks`));
}
