import { extractDomain, isDomainActiveStripeCustomer } from '@/lib/stripe';
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

  // Check auth
  const authSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!authSession?.user?.id) {
    redirect('/sign-in');
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
    const emailDomain = extractDomain(userEmail ?? '');

    if (emailDomain) {
      // Auto-approve for trycomp.ai emails (internal team)
      const isTrycompEmail = emailDomain === 'trycomp.ai';

      // Check Stripe for other domains
      const isStripeCustomer = isTrycompEmail
        ? false
        : await isDomainActiveStripeCustomer(emailDomain);

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
