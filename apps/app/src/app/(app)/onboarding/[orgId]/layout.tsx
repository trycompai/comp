import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { MinimalHeader } from '@/components/layout/MinimalHeader';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { OnboardingSidebar } from '../../setup/components/OnboardingSidebar';

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
    <main className="flex min-h-dvh flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Form Section - Left Side */}
        <div className="flex-1 flex flex-col">
          <MinimalHeader
            user={session.user}
            organizations={[]}
            currentOrganization={organization}
            variant="onboarding"
          />
          {children}
        </div>

        {/* Sidebar Section - Right Side, Hidden on Mobile */}
        <div className="hidden md:flex md:w-1/2 min-h-screen bg-[#FAFAFA] items-end justify-center py-16 px-8">
          <OnboardingSidebar className="w-full max-w-xl mx-auto h-1/2 mt-auto" />
        </div>
      </div>
      <CheckoutCompleteDialog orgId={organization.id} />
    </main>
  );
}
