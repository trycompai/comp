import { fetchStripePriceDetails } from '@/actions/stripe/fetch-price-details';
import { getSubscriptionData } from '@/app/api/stripe/getSubscriptionData';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { BookingStep } from './components/booking-step';
import { PricingCards } from './pricing-cards';
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

  // Check if they already have an active subscription
  const subscription = await getSubscriptionData(orgId);

  // Only redirect if they have the managed plan
  if (
    member.organization.subscriptionType === 'MANAGED' &&
    subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing')
  ) {
    // Already have managed plan, redirect to dashboard
    redirect(`/${orgId}`);
  }

  // Fetch price details from Stripe
  const priceDetails = await fetchStripePriceDetails();

  const hadCall = member.organization.hadCall;

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

  if (!hadCall) {
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
          />
        </div>
      </>
    );
  }

  return (
    <>
      <UpgradePageTracking />

      <div className="mx-auto px-4 max-w-7xl">
        <div className="relative">
          <div className="relative bg-transparent p-8 flex flex-col gap-8">
            <div className="flex flex-col gap-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Pay your invoice</h1>
                <p className="text-xl text-muted-foreground">
                  Pay your invoice to get started with your compliance journey.
                </p>
              </div>
              <PricingCards
                organizationId={orgId}
                priceDetails={{
                  managedMonthlyPrice: priceDetails.managedMonthlyPrice,
                  managedYearlyPrice: priceDetails.managedYearlyPrice,
                  starterMonthlyPrice: priceDetails.starterMonthlyPrice,
                  starterYearlyPrice: priceDetails.starterYearlyPrice,
                }}
                currentSubscription={subscription}
                subscriptionType={member.organization.subscriptionType}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
