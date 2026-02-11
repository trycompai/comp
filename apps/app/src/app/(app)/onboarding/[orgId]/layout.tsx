import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { MinimalHeader } from '@/components/layout/MinimalHeader';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import type { Organization } from '@db';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { OnboardingSidebar } from '../../setup/components/OnboardingSidebar';

interface OrgInfo {
  id: string;
  name: string;
}

interface AuthMeResponse {
  organizations: OrgInfo[];
}

interface OnboardingRouteLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function OnboardingRouteLayout({
  children,
  params,
}: OnboardingRouteLayoutProps) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    notFound();
  }

  // Verify membership via auth/me endpoint
  const meRes = await serverApi.get<AuthMeResponse>('/v1/auth/me');
  const orgs = meRes.data?.organizations ?? [];
  const organization = orgs.find((o) => o.id === orgId);

  if (!organization) {
    notFound();
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col">
          <MinimalHeader
            user={session.user}
            organizations={[]}
            currentOrganization={organization as Organization}
            variant="onboarding"
          />
          {children}
        </div>

        <div className="hidden md:flex md:w-1/2 min-h-screen bg-[#FAFAFA] items-end justify-center py-16 px-8">
          <OnboardingSidebar className="w-full max-w-xl mx-auto h-1/2 mt-auto" />
        </div>
      </div>
      <CheckoutCompleteDialog orgId={organization.id} />
    </main>
  );
}
