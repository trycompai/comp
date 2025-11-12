import { getOrganizations } from '@/data/getOrganizations';
import type { Organization } from '@db';
import { MainMenu } from './main-menu';
import { OrganizationSwitcher } from './organization-switcher';
import { SidebarCollapseButton } from './sidebar-collapse-button';
import { SidebarLogo } from './sidebar-logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarRail,
} from './ui/sidebar';

export async function AppSidebar({ organization }: { organization: Organization | null }) {
  const { organizations } = await getOrganizations();

  return (
    <Sidebar collapsible="icon" className="bg-card overflow-x-clip">
      <SidebarHeader>
        <div className="flex items-center p-2">
          <SidebarLogo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <OrganizationSwitcher organizations={organizations} organization={organization} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <MainMenu organizationId={organization?.id ?? ''} organization={organization} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarCollapseButton />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
