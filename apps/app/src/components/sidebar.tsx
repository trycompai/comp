import { getOrganizations } from '@/data/getOrganizations';
import type { Organization } from '@db';
import { cookies } from 'next/headers';
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

  return (
    <div className="h-full px-3 py-3 translate-x-0">
      <div className="flex h-full w-full flex-col gap-4">
        <div className="flex items-center justify-start gap-1.5">
          <SidebarLogo isCollapsed={isCollapsed} />
          <OrganizationSwitcher
            organizations={organizations}
            organization={organization}
            isCollapsed={isCollapsed}
          />
        </div>

        <MainMenu
          organizationId={organization?.id ?? ''}
          organization={organization}
          isCollapsed={isCollapsed}
        />
      </div>

      <div className="flex justify-center py-2">
        <SidebarCollapseButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
