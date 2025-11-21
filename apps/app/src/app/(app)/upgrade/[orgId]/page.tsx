import { db } from '@/lib/db';
import { auth } from '@/utils/auth';
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
    },
    include: {
      organization: true,
    },
  });

  if (!member) {
    redirect('/');
  }

  const hasAccess = member.organization.hasAccess;

  // If user has access to org but hasn't completed onboarding, redirect to onboarding
  if (hasAccess && !member.organization.onboardingCompleted) {
    redirect(`/onboarding/${orgId}`);
  }

  // If user has access to org and has completed onboarding, redirect to org
  if (hasAccess && member.organization.onboardingCompleted) {
    redirect(`/${orgId}`);
  }

  const frameworkInstances = await db.frameworkInstance.findMany({
    where: {
      organizationId: orgId,
    },
    include: {
      framework: true,
    },
  });

  const complianceFrameworks = frameworkInstances.map((framework) =>
    framework.framework.name.toLowerCase().replaceAll(' ', ''),
  );

  return (
    <>
      <UpgradePageTracking />
      <div className="mx-auto px-4 max-w-7xl my-auto min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <BookingStep
          email={authSession.user.email}
          name={authSession.user.name}
          company={member.organization.name}
          orgId={orgId}
          complianceFrameworks={complianceFrameworks}
          hasAccess={hasAccess}
        />
      </div>
    </>
  );
}
