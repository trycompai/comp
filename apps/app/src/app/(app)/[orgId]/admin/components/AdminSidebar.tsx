'use client';

import { AppShellNav, AppShellNavItem } from '@trycompai/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  orgId: string;
}

export function AdminSidebar({ orgId }: AdminSidebarProps) {
  const pathname = usePathname() ?? '';

  const items = [
    { id: 'organizations', label: 'Organizations', path: `/${orgId}/admin/organizations` },
    { id: 'integrations', label: 'Integrations', path: `/${orgId}/admin/integrations` },
    { id: 'timeline-templates', label: 'Timeline Templates', path: `/${orgId}/admin/timeline-templates` },
  ];

  const isPathActive = (path: string) => pathname.startsWith(path);

  return (
    <AppShellNav>
      {items.map((item) => (
        <Link key={item.id} href={item.path}>
          <AppShellNavItem isActive={isPathActive(item.path)}>
            {item.label}
          </AppShellNavItem>
        </Link>
      ))}
    </AppShellNav>
  );
}
