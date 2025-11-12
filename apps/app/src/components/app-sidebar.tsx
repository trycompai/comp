import { getOrganizations } from '@/data/getOrganizations';
import type { Organization } from '@db';
import { MainMenu } from './main-menu';
import { OrganizationSwitcher } from './organization-switcher';
import { SidebarCollapseButton } from './sidebar-collapse-button';
import { SidebarLogo } from './sidebar-logo';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from './ui/sidebar';

export async function AppSidebar({ organization }: { organization: Organization | null }) {
  const { organizations } = await getOrganizations();

  return (
    <Sidebar collapsible="icon" className="bg-card overflow-x-clip">
      <SidebarHeader className="p-4 gap-0">
        <div className="flex items-center justify-start h-10">
          <SidebarLogo />
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <OrganizationSwitcher organizations={organizations} organization={organization} />
          <MainMenu organizationId={organization?.id ?? ''} organization={organization} />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1" />

      <SidebarFooter className="p-0">
        <SidebarCollapseButton />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
