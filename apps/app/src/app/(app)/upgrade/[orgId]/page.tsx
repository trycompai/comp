import { extractDomain, isDomainActiveStripeCustomer, isPublicEmailDomain } from '@/lib/stripe';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BookingStep } from './components/booking-step';
import { UpgradePageTracking } from './UpgradePageTracking';

interface PageProps {
  params: Promise<{
    orgId: string;
  }>;
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

  // Sync activeOrganizationId if it doesn't match the URL
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

  // Verify user has access to this org
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

  let hasAccess = member.organization.hasAccess;

  // Auto-approve based on user's email domain
  if (!hasAccess) {
    const userEmail = authSession.user.email;
    const userEmailDomain = extractDomain(userEmail ?? '');
    const orgWebsiteDomain = extractDomain(member.organization.website ?? '');

    if (userEmailDomain) {
      // Auto-approve for trycomp.ai emails (internal team)
      const isTrycompEmail = userEmailDomain === 'trycomp.ai';

      const canAutoApproveViaDomain =
        !isTrycompEmail &&
        Boolean(orgWebsiteDomain) &&
        userEmailDomain === orgWebsiteDomain &&
        !isPublicEmailDomain(userEmailDomain);

      // Check Stripe for other domains
      const isStripeCustomer = canAutoApproveViaDomain
        ? await isDomainActiveStripeCustomer(userEmailDomain)
        : false;

      if (isTrycompEmail || isStripeCustomer) {
        await db.organization.update({
          where: { id: orgId },
          data: { hasAccess: true },
        });
        hasAccess = true;
      }
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

  return (
    <>
      <UpgradePageTracking />
      <div className="mx-auto px-4 max-w-7xl my-auto min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <BookingStep company={member.organization.name} orgId={orgId} hasAccess={hasAccess} />
      </div>
    </>
  );
}
