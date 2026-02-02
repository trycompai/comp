'use client';

import { AppShellNav, AppShellNavItem } from '@trycompai/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SettingsSidebarProps {
  orgId: string;
  showBrowserTab: boolean;
}

type SettingsNavItem = {
  id: string;
  label: string;
  path: string;
  hidden?: boolean;
};

export function SettingsSidebar({ orgId, showBrowserTab }: SettingsSidebarProps) {
  const pathname = usePathname() ?? '';

  const items: SettingsNavItem[] = [
    { id: 'general', label: 'General', path: `/${orgId}/settings` },
    { id: 'context', label: 'Context', path: `/${orgId}/settings/context-hub` },
    { id: 'api', label: 'API Keys', path: `/${orgId}/settings/api-keys` },
    { id: 'secrets', label: 'Secrets', path: `/${orgId}/settings/secrets` },
    { id: 'roles', label: 'Roles', path: `/${orgId}/settings/roles` },
    {
      id: 'browser',
      label: 'Browser',
      path: `/${orgId}/settings/browser-connection`,
      hidden: !showBrowserTab,
    },
    { id: 'user', label: 'User Settings', path: `/${orgId}/settings/user` },
  ];

  const isPathActive = (path: string) => {
    if (path === `/${orgId}/settings`) {
      return pathname === path;
    }
    return pathname.startsWith(`${path}`);
  };

  const visibleItems = items.filter((item) => !item.hidden);

  return (
    <AppShellNav>
      {visibleItems.map((item) => (
        <Link key={item.id} href={item.path}>
          <AppShellNavItem isActive={isPathActive(item.path)}>{item.label}</AppShellNavItem>
        </Link>
      ))}
    </AppShellNav>
  );
}
