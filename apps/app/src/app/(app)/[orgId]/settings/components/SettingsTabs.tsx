'use client';

import { PageHeader, PageLayout } from '@trycompai/design-system';
import { usePathname } from 'next/navigation';

interface SettingsTabsProps {
  orgId: string;
  showBrowserTab: boolean;
  children: React.ReactNode;
}

export function SettingsTabs({ orgId, children }: SettingsTabsProps) {
  const pathname = usePathname() ?? '';

  const title = (() => {
    if (pathname === `/${orgId}/settings`) return 'General Settings';
    if (pathname.startsWith(`/${orgId}/settings/context-hub`)) return 'Context';
    if (pathname.startsWith(`/${orgId}/settings/api-keys`)) return 'API Keys';
    if (pathname.startsWith(`/${orgId}/settings/secrets`)) return 'Secrets';
    if (pathname.startsWith(`/${orgId}/settings/browser-connection`)) return 'Browser';
    if (pathname.startsWith(`/${orgId}/settings/user`)) return 'User Settings';
    return 'Settings';
  })();

  return (
    <PageLayout header={<PageHeader title={title} />}>
      {children}
    </PageLayout>
  );
}
