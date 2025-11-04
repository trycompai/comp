import { AnimatedLayout } from '@/components/animated-layout';
import { CheckoutCompleteDialog } from '@/components/dialogs/checkout-complete-dialog';
import { Header } from '@/components/header';
import { AssistantSheet } from '@/components/sheets/assistant-sheet';
import { Sidebar } from '@/components/sidebar';
import { TriggerTokenProvider } from '@/components/trigger-token-provider';
import { SidebarProvider } from '@/context/sidebar-context';
import { auth } from '@/utils/auth';
import { db } from '@db';
import dynamic from 'next/dynamic';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ConditionalOnboardingTracker } from './components/ConditionalOnboardingTracker';
import { DynamicMinHeight } from './components/DynamicMinHeight';

const HotKeys = dynamic(() => import('@/components/hot-keys').then((mod) => mod.HotKeys), {
  ssr: true,
});

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: requestedOrgId } = await params;

  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get('sidebar-collapsed')?.value === 'true';
  let publicAccessToken = cookieStore.get('publicAccessToken')?.value || undefined;

  // Check if user has access to this organization
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    console.log('no session');
    return redirect('/auth');
  }

  // First check if the organization exists and load access flags
  const organization = await db.organization.findUnique({
    where: { id: requestedOrgId },
  });

  if (!organization) {
    // Organization doesn't exist
    return redirect('/auth/not-found');
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: requestedOrgId,
      deactivated: false,
    },
  });

  if (!member) {
    // User doesn't have access to this organization
    return redirect('/auth/unauthorized');
  }

  if (member.role === 'employee') {
    return redirect('/no-access');
  }

  // If this org is not accessible on current plan, redirect to upgrade
  if (!organization.hasAccess) {
    return redirect(`/upgrade/${organization.id}`);
  }

  // If onboarding is required and user isn't already on onboarding, redirect
  if (!organization.onboardingCompleted) {
    return redirect(`/onboarding/${organization.id}`);
  }

  const onboarding = await db.onboarding.findFirst({
    where: {
      organizationId: requestedOrgId,
    },
  });

  return (
    <TriggerTokenProvider
      triggerJobId={onboarding?.triggerJobId || undefined}
      initialToken={publicAccessToken || undefined}
    >
      <SidebarProvider initialIsCollapsed={isCollapsed}>
        <AnimatedLayout sidebar={<Sidebar organization={organization} />} isCollapsed={isCollapsed}>
          {onboarding?.triggerJobId && <ConditionalOnboardingTracker onboarding={onboarding} />}
          <Header organizationId={organization.id} />
          <DynamicMinHeight>{children}</DynamicMinHeight>
          <AssistantSheet />
          <Suspense fallback={null}>
            <CheckoutCompleteDialog orgId={organization.id} />
          </Suspense>
        </AnimatedLayout>
        <HotKeys />
      </SidebarProvider>
    </TriggerTokenProvider>
  );
}
