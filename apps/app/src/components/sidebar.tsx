import { getFeatureFlags } from '@/app/posthog';
import { getOrganizations } from '@/data/getOrganizations';
import { auth } from '@/utils/auth';
import { cn } from '@comp/ui/cn';
import type { Organization } from '@db';
import { cookies, headers } from 'next/headers';
import { MainMenu } from './main-menu';
import { OrganizationSwitcher } from './organization-switcher';
import { SidebarCollapseButton } from './sidebar-collapse-button';
import { SidebarLogo } from './sidebar-logo';

export async function Sidebar({
  organization,
  collapsed = false,
}: {
  organization: Organization | null;
  collapsed?: boolean;
}) {
  const cookieStore = await cookies();
  const isCollapsed = collapsed || cookieStore.get('sidebar-collapsed')?.value === 'true';
  const { organizations } = await getOrganizations();

  // Check feature flags for menu items
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  let isQuestionnaireEnabled = false;
  let isTrustNdaEnabled = false;
  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isQuestionnaireEnabled = flags['ai-vendor-questionnaire'] === true;
    isTrustNdaEnabled = flags['is-trust-nda-enabled'] === true;
  }

  return (
    <div className="bg-card flex h-full flex-col gap-0 overflow-x-clip">
      <div className="flex flex-col gap-2 p-4">
        <div className={cn('flex items-center justify-start', isCollapsed && 'justify-center')}>
          <SidebarLogo isCollapsed={isCollapsed} />
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <OrganizationSwitcher
            organizations={organizations}
            organization={organization}
            isCollapsed={isCollapsed}
          />
          <MainMenu
            organizationId={organization?.id ?? ''}
            organization={organization}
            isCollapsed={isCollapsed}
            isQuestionnaireEnabled={isQuestionnaireEnabled}
            isTrustNdaEnabled={isTrustNdaEnabled}
          />
        </div>
      </div>
      <div className="flex-1" />

      <div className="flex justify-center py-2">
        <SidebarCollapseButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
