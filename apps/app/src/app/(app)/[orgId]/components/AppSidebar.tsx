'use client';

import {
  Connect,
  Dashboard,
  DocumentSigned,
  DocumentTasks,
  FolderDetails,
  ListChecked,
  Policy,
  Partnership,
  Scale,
  SettingsAdjust,
  TestTool,
  UserMultiple,
} from '@carbon/icons-react';
import type { Organization } from '@db';
import { AppShellNav, AppShellNavItem } from '@trycompai/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  path: string;
  name: string;
  icon: React.ReactNode;
  hidden?: boolean;
}

interface AppSidebarProps {
  organization: Organization;
  isQuestionnaireEnabled: boolean;
  hasAuditorRole: boolean;
  isOnlyAuditor: boolean;
}

export function AppSidebar({
  organization,
  isQuestionnaireEnabled,
  hasAuditorRole,
  isOnlyAuditor,
}: AppSidebarProps) {
  const pathname = usePathname() ?? '';

  const navItems: NavItem[] = [
    {
      id: 'frameworks',
      path: `/${organization.id}/frameworks`,
      name: 'Overview',
      icon: <Dashboard className="size-4" />,
    },
    {
      id: 'auditor',
      path: `/${organization.id}/auditor`,
      name: 'Auditor View',
      icon: <DocumentSigned className="size-4" />,
      hidden: !hasAuditorRole,
    },
    {
      id: 'controls',
      path: `/${organization.id}/controls`,
      name: 'Controls',
      icon: <SettingsAdjust className="size-4" />,
      hidden: !organization.advancedModeEnabled,
    },
    {
      id: 'policies',
      path: `/${organization.id}/policies`,
      name: 'Policies',
      icon: <Policy className="size-4" />,
    },
    {
      id: 'tasks',
      path: `/${organization.id}/tasks`,
      name: 'Evidence',
      icon: <ListChecked className="size-4" />,
    },
    {
      id: 'documents',
      path: `/${organization.id}/documents`,
      name: 'Documents',
      icon: <FolderDetails className="size-4" />,
    },
    {
      id: 'people',
      path: `/${organization.id}/people/all`,
      name: 'People',
      icon: <UserMultiple className="size-4" />,
    },
    {
      id: 'risk',
      path: `/${organization.id}/risk`,
      name: 'Risks',
      icon: <Scale className="size-4" />,
    },
    {
      id: 'vendors',
      path: `/${organization.id}/vendors`,
      name: 'Vendors',
      icon: <Partnership className="size-4" />,
    },
    {
      id: 'questionnaire',
      path: `/${organization.id}/questionnaire`,
      name: 'Questionnaire',
      icon: <DocumentTasks className="size-4" />,
      hidden: !isQuestionnaireEnabled,
    },
    {
      id: 'integrations',
      path: `/${organization.id}/integrations`,
      name: 'Integrations',
      icon: <Connect className="size-4" />,
      hidden: isOnlyAuditor,
    },
    {
      id: 'tests',
      path: `/${organization.id}/cloud-tests`,
      name: 'Cloud Tests',
      icon: <TestTool className="size-4" />,
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
    <AppShellNav>
      {visibleItems.map((item) => (
        <Link key={item.id} href={item.path}>
          <AppShellNavItem isActive={isPathActive(item.path)} icon={item.icon}>
            {item.name}
          </AppShellNavItem>
        </Link>
      ))}
    </AppShellNav>
  );
}
