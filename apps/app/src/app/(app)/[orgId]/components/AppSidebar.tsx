'use client';

import { OrganizationSwitcher } from '@/components/organization-switcher';
import { SidebarLogo } from '@/components/sidebar-logo';
import { useSidebar } from '@/context/sidebar-context';
import type { Organization } from '@db';
import {
  AppShellNav,
  AppShellNavFooter,
  AppShellNavItem,
  AppShellSidebarHeader,
  useAppShell,
} from '@trycompai/design-system';
import {
  ClipboardCheck,
  FileTextIcon,
  FlaskConical,
  Gauge,
  ListCheck,
  NotebookText,
  Settings,
  ShieldCheck,
  ShieldEllipsis,
  SidebarClose,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Risk icon from @comp/ui/icons - inline it to avoid extra dependency
const RiskIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 9v4" />
    <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0z" />
    <path d="M12 16h.01" />
  </svg>
);

interface NavItem {
  id: string;
  path: string;
  name: string;
  icon: React.ReactNode;
  hidden?: boolean;
}

interface AppSidebarProps {
  organization: Organization;
  organizations: Organization[];
  logoUrls: Record<string, string>;
  isQuestionnaireEnabled: boolean;
  isTrustNdaEnabled: boolean;
  hasAuditorRole: boolean;
  isOnlyAuditor: boolean;
}

export function AppSidebar({
  organization,
  organizations,
  logoUrls,
  isQuestionnaireEnabled,
  isTrustNdaEnabled,
  hasAuditorRole,
  isOnlyAuditor,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const { toggleSidebar } = useAppShell();

  const navItems: NavItem[] = [
    {
      id: 'frameworks',
      path: `/${organization.id}/frameworks`,
      name: 'Overview',
      icon: <Gauge className="size-4" />,
    },
    {
      id: 'auditor',
      path: `/${organization.id}/auditor`,
      name: 'Auditor View',
      icon: <ClipboardCheck className="size-4" />,
      hidden: !hasAuditorRole,
    },
    {
      id: 'controls',
      path: `/${organization.id}/controls`,
      name: 'Controls',
      icon: <ShieldEllipsis className="size-4" />,
      hidden: !organization.advancedModeEnabled,
    },
    {
      id: 'policies',
      path: `/${organization.id}/policies`,
      name: 'Policies',
      icon: <NotebookText className="size-4" />,
    },
    {
      id: 'tasks',
      path: `/${organization.id}/tasks`,
      name: 'Evidence',
      icon: <ListCheck className="size-4" />,
    },
    {
      id: 'trust',
      path: `/${organization.id}/trust`,
      name: 'Trust',
      icon: <ShieldCheck className="size-4" />,
      hidden: !isTrustNdaEnabled,
    },
    {
      id: 'people',
      path: `/${organization.id}/people/all`,
      name: 'People',
      icon: <Users className="size-4" />,
    },
    {
      id: 'risk',
      path: `/${organization.id}/risk`,
      name: 'Risks',
      icon: <RiskIcon className="size-4" />,
    },
    {
      id: 'vendors',
      path: `/${organization.id}/vendors`,
      name: 'Vendors',
      icon: <Store className="size-4" />,
    },
    {
      id: 'questionnaire',
      path: `/${organization.id}/questionnaire`,
      name: 'Questionnaire',
      icon: <FileTextIcon className="size-4" />,
      hidden: !isQuestionnaireEnabled,
    },
    {
      id: 'integrations',
      path: `/${organization.id}/integrations`,
      name: 'Integrations',
      icon: <Zap className="size-4" />,
      hidden: isOnlyAuditor,
    },
    {
      id: 'tests',
      path: `/${organization.id}/cloud-tests`,
      name: 'Cloud Tests',
      icon: <FlaskConical className="size-4" />,
    },
  ];

  const isPathActive = (itemPath: string) => {
    const itemPathParts = itemPath.split('/').filter(Boolean);
    const itemBaseSegment = itemPathParts.length > 1 ? itemPathParts[1] : '';

    const currentPathParts = pathname.split('/').filter(Boolean);
    const currentBaseSegment = currentPathParts.length > 1 ? currentPathParts[1] : '';

    if (itemPath === `/${organization.id}` || itemPath === `/${organization.id}/implementation`) {
      return (
        pathname === `/${organization.id}` ||
        pathname?.startsWith(`/${organization.id}/implementation`)
      );
    }

    return itemBaseSegment === currentBaseSegment;
  };

  const visibleItems = navItems.filter((item) => !item.hidden);

  return (
    <>
      <AppShellSidebarHeader title={organization.name || 'Organization'}>
        <div className="flex w-full items-center gap-2">
          <SidebarLogo isCollapsed={isCollapsed} />
          <div className="flex-1">
            <OrganizationSwitcher
              organizations={organizations}
              organization={organization}
              isCollapsed={false}
              logoUrls={logoUrls}
            />
          </div>
        </div>
      </AppShellSidebarHeader>

      <AppShellNav>
        {visibleItems.map((item) => (
          <Link key={item.id} href={item.path}>
            <AppShellNavItem isActive={isPathActive(item.path)} icon={item.icon}>
              {item.name}
            </AppShellNavItem>
          </Link>
        ))}
      </AppShellNav>

      <AppShellNavFooter>
        {!isOnlyAuditor && (
          <Link href={`/${organization.id}/settings`}>
            <AppShellNavItem
              isActive={isPathActive(`/${organization.id}/settings`)}
              icon={<Settings className="size-4" />}
            >
              Settings
            </AppShellNavItem>
          </Link>
        )}
        <AppShellNavItem icon={<SidebarClose className="size-4" />} onClick={toggleSidebar}>
          Collapse sidebar
        </AppShellNavItem>
      </AppShellNavFooter>
    </>
  );
}
