'use client';

import { AppShellNav, AppShellNavItem } from '@trycompai/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TrustSidebarProps {
  orgId: string;
}

type TrustNavItem = {
  id: string;
  label: string;
  path: string;
  hidden?: boolean;
};

export function TrustSidebar({ orgId }: TrustSidebarProps) {
  const pathname = usePathname() ?? '';

  const items: TrustNavItem[] = [
    { id: 'overview', label: 'Overview', path: `/${orgId}/trust` },
    { id: 'access-requests', label: 'Access Requests', path: `/${orgId}/trust/access-requests` },
    { id: 'settings', label: 'Settings', path: `/${orgId}/trust/settings` },
  ];

  const isPathActive = (path: string) => {
    if (path === `/${orgId}/trust`) {
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
