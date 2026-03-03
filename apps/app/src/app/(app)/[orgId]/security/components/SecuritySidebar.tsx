'use client';

import { AppShellNav, AppShellNavItem } from '@trycompai/design-system';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SecuritySidebarProps {
  orgId: string;
}

type SecurityNavItem = {
  id: string;
  label: string;
  path: string;
};

export function SecuritySidebar({ orgId }: SecuritySidebarProps) {
  const pathname = usePathname() ?? '';

  const subscriptionPath = `/${orgId}/security/penetration-tests/subscription`;

  const items: SecurityNavItem[] = [
    {
      id: 'penetration-tests',
      label: 'Penetration Tests',
      path: `/${orgId}/security/penetration-tests`,
    },
    {
      id: 'pentest-billing',
      label: 'Pentest Billing',
      path: subscriptionPath,
    },
  ];

  const isPathActive = (path: string) => {
    if (path === `/${orgId}/security/penetration-tests`) {
      // Don't highlight when on the subscription sub-page
      return pathname.startsWith(path) && !pathname.startsWith(subscriptionPath);
    }
    return pathname.startsWith(path);
  };

  return (
    <AppShellNav>
      {items.map((item) => (
        <Link key={item.id} href={item.path}>
          <AppShellNavItem isActive={isPathActive(item.path)}>{item.label}</AppShellNavItem>
        </Link>
      ))}
    </AppShellNav>
  );
}
