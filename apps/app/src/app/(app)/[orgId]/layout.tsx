import { AnimatedLayout } from '@/components/animated-layout';
import { Header } from '@/components/header';
import { AssistantSheet } from '@/components/sheets/assistant-sheet';
import { Sidebar } from '@/components/sidebar';
import { SidebarProvider } from '@/context/sidebar-context';
import { getCurrentOrganization } from '@/lib/currentOrganization';
import dynamic from 'next/dynamic';
import { cookies } from 'next/headers';
import { OnboardingTracker } from './components/OnboardingTracker';
import { db } from '@comp/db';

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
  const publicAccessToken = cookieStore.get('publicAccessToken')?.value;

  const currentOrganization = await getCurrentOrganization({
    requestedOrgId,
  });

  const onboarding = await db.onboarding.findFirst({
    where: {
      organizationId: currentOrganization?.id,
    },
  });

  const isOnboardingRunning = !!onboarding?.triggerJobId && !onboarding.completed;
  const navbarHeight = 69 + 1; // 1 for border
  const onboardingHeight = 132 + 1; // 1 for border

  const pixelsOffset = isOnboardingRunning ? navbarHeight + onboardingHeight : navbarHeight;

  return (
    <SidebarProvider initialIsCollapsed={isCollapsed}>
      <AnimatedLayout
        sidebar={<Sidebar organization={currentOrganization} />}
        isCollapsed={isCollapsed}
      >
        {onboarding?.triggerJobId && (
          <OnboardingTracker onboarding={onboarding} publicAccessToken={publicAccessToken ?? ''} />
        )}
        <Header />
        <div
          className="textured-background mx-auto px-4 py-4"
          style={{ minHeight: `calc(100vh - ${pixelsOffset}px)` }}
        >
          {children}
        </div>
        <AssistantSheet />
      </AnimatedLayout>
      <HotKeys />
    </SidebarProvider>
  );
}
