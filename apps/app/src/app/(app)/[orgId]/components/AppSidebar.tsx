'use client';

import {
  Chemistry,
  Dashboard,
  Document,
  Group,
  Integration,
  ListChecked,
  Policy,
  Security,
  ShoppingBag,
  Task,
  TaskComplete,
  Warning,
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
      icon: <TaskComplete className="size-4" />,
      hidden: !hasAuditorRole,
    },
    {
      id: 'controls',
      path: `/${organization.id}/controls`,
      name: 'Controls',
      icon: <Security className="size-4" />,
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
      id: 'company',
      path: `/${organization.id}/company`,
      name: 'Tasks',
      icon: <Task className="size-4" />,
    },
    {
      id: 'people',
      path: `/${organization.id}/people/all`,
      name: 'People',
      icon: <Group className="size-4" />,
    },
    {
      id: 'risk',
      path: `/${organization.id}/risk`,
      name: 'Risks',
      icon: <Warning className="size-4" />,
    },
    {
      id: 'vendors',
      path: `/${organization.id}/vendors`,
      name: 'Vendors',
      icon: <ShoppingBag className="size-4" />,
    },
    {
      id: 'questionnaire',
      path: `/${organization.id}/questionnaire`,
      name: 'Questionnaire',
      icon: <Document className="size-4" />,
      hidden: !isQuestionnaireEnabled,
    },
    {
      id: 'integrations',
      path: `/${organization.id}/integrations`,
      name: 'Integrations',
      icon: <Integration className="size-4" />,
      hidden: isOnlyAuditor,
    },
    {
      id: 'tests',
      path: `/${organization.id}/cloud-tests`,
      name: 'Cloud Tests',
      icon: <Chemistry className="size-4" />,
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
