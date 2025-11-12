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
    <div className="flex h-full flex-col px-3 py-3 translate-x-0">
      <div className="flex flex-col gap-1">
        <SidebarLogo isCollapsed={isCollapsed} organizationId={organization?.id} />
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

      <div className="mt-auto flex justify-center">
        <SidebarCollapseButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
