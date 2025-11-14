import { getFeatureFlags } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { UserMenu } from '@/components/user-menu';
import { getOrganizations } from '@/data/getOrganizations';
import { Skeleton } from '@comp/ui/skeleton';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import { AssistantButton } from './ai/chat-button';
import { MobileMenu } from './mobile-menu';
import { NotificationBell } from './notifications/notification-bell';

export async function Header({
  organizationId,
  hideChat = false,
}: {
  organizationId?: string;
  hideChat?: boolean;
}) {
  const { organizations } = await getOrganizations();

  // Check feature flag for questionnaire menu item
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  let isQuestionnaireEnabled = false;
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isQuestionnaireEnabled = flags['ai-vendor-questionnaire'] === true;
  }

  return (
    <header className="border/40 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm bg-card">
      <MobileMenu
        organizations={organizations}
        organizationId={organizationId}
        isQuestionnaireEnabled={isQuestionnaireEnabled}
      />

      {!hideChat && <AssistantButton />}

      <div className="ml-auto mr-2 flex items-center">
        <NotificationBell />
      </div>
      <div className="flex items-center space-x-2">
        <Suspense fallback={<Skeleton className="h-8 w-8 rounded-full" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
