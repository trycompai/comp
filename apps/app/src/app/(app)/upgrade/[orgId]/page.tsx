import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BookingStep } from './components/booking-step';
import { UpgradePageTracking } from './UpgradePageTracking';

interface PageProps {
  params: Promise<{
    orgId: string;
  }>;
}

interface AutoApproveResponse {
  hasAccess: boolean;
  autoApproved: boolean;
  reason: string;
}

export default async function UpgradePage({ params }: PageProps) {
  const { orgId } = await params;

  // Get headers once to avoid multiple async calls
  const requestHeaders = await headers();

  // Check auth
  const authSession = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!authSession?.user?.id) {
    redirect('/sign-in');
  }

  // Verify user has access to this org BEFORE syncing activeOrganizationId
  const member = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: authSession.user.id,
      deactivated: false,
    },
    include: {
      organization: true,
    },
  });

  if (!member) {
    redirect('/');
  }

  // Sync activeOrganizationId only after membership is verified.
  // Required so the API's HybridAuthGuard resolves the right org from session
  // when we call /v1/organization-access/auto-approve below.
  const currentActiveOrgId = authSession.session.activeOrganizationId;
  if (!currentActiveOrgId || currentActiveOrgId !== orgId) {
    try {
      await auth.api.setActiveOrganization({
        headers: requestHeaders,
        body: {
          organizationId: orgId,
        },
      });
    } catch (error) {
      console.error('[UpgradePage] Failed to sync activeOrganizationId:', error);
    }
  }

  let hasAccess = member.organization.hasAccess;

  // Auto-approval (self-hosted, trycomp emails, domain-matched Stripe customers)
  // is decided server-side by the API, which also persists hasAccess. Soft-fail
  // so a transient API error never blocks the booking step from rendering.
  if (!hasAccess) {
    const response = await serverApi.post<AutoApproveResponse>(
      '/v1/organization-access/auto-approve',
    );

    if (response.data?.hasAccess) {
      hasAccess = true;
    } else if (response.error) {
      console.error('[UpgradePage] auto-approve API error:', response.error);
    }
  }

  // If user has access to org but hasn't completed onboarding, redirect to onboarding
  if (hasAccess && !member.organization.onboardingCompleted) {
    redirect(`/onboarding/${orgId}`);
  }

  // If user has access to org and has completed onboarding, redirect to org
  if (hasAccess && member.organization.onboardingCompleted) {
    redirect(`/${orgId}`);
  }

  // Check if user has other completed orgs (for cancel button)
  const otherOrgCount = await db.member.count({
    where: {
      userId: authSession.user.id,
      organizationId: { not: orgId },
      deactivated: false,
      organization: { onboardingCompleted: true, hasAccess: true },
    },
  });

  return (
    <>
      <UpgradePageTracking />
      <div className="mx-auto px-4 max-w-7xl my-auto min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <BookingStep
          company={member.organization.name}
          orgId={orgId}
          hasAccess={hasAccess}
          hasOtherOrgs={otherOrgCount > 0}
        />
      </div>
    </>
  );
}
