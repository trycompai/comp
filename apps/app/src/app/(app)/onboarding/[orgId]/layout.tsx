import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { auth } from '@/utils/auth';
import { db } from '@trycompai/db';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

interface OnboardingRouteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function OnboardingRouteLayout({
  children,
  params,
}: OnboardingRouteLayoutProps) {
  const { orgId } = await params;

  // Get current user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    notFound();
  }

  // Get organization and verify membership
  const organization = await db.organization.findFirst({
    where: {
      id: orgId,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  return (
    <OnboardingLayout variant="onboarding" currentOrganization={organization}>
      {children}
      <CheckoutCompleteDialog orgId={organization.id} />
    </OnboardingLayout>
  );
}
