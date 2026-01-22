'use client';

import { AppShellRailItem } from '@trycompai/design-system';
import {
  FlaskConical,
  Gauge,
  ListCheck,
  NotebookText,
  Settings,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface AppShellRailNavProps {
  organizationId: string;
}

export function AppShellRailNav({ organizationId }: AppShellRailNavProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const orgBase = `/${organizationId}`;

  const isActivePrefix = (prefix: string): boolean => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };

  const items = [
    {
      href: `${orgBase}/frameworks`,
      label: 'Overview',
      icon: <Gauge />,
      isActive: isActivePrefix(`${orgBase}/frameworks`),
    },
    {
      href: `${orgBase}/policies`,
      label: 'Policies',
      icon: <NotebookText />,
      isActive: isActivePrefix(`${orgBase}/policies`),
    },
    {
      href: `${orgBase}/tasks`,
      label: 'Evidence',
      icon: <ListCheck />,
      isActive: isActivePrefix(`${orgBase}/tasks`),
    },
    {
      href: `${orgBase}/people/all`,
      label: 'People',
      icon: <Users />,
      isActive: isActivePrefix(`${orgBase}/people`),
    },
    {
      href: `${orgBase}/vendors`,
      label: 'Vendors',
      icon: <Store />,
      isActive: isActivePrefix(`${orgBase}/vendors`),
    },
    {
      href: `${orgBase}/integrations`,
      label: 'Integrations',
      icon: <Zap />,
      isActive: isActivePrefix(`${orgBase}/integrations`),
    },
    {
      href: `${orgBase}/cloud-tests`,
      label: 'Cloud Tests',
      icon: <FlaskConical />,
      isActive: isActivePrefix(`${orgBase}/cloud-tests`),
    },
    {
      href: `${orgBase}/settings`,
      label: 'Settings',
      icon: <Settings />,
      isActive: isActivePrefix(`${orgBase}/settings`),
    },
  ] as const;

  return (
    <>
      {items.map((item) => (
        <AppShellRailItem
          key={item.href}
          isActive={item.isActive}
          icon={item.icon}
          label={item.label}
          type="button"
          onClick={() => router.push(item.href)}
        />
      ))}
    </>
  );
}

