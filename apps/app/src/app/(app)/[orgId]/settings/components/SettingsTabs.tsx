'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import { usePathname } from 'next/navigation';
import { AddSecretDialog } from '../secrets/components/AddSecretDialog';

interface SettingsTabsProps {
  orgId: string;
  showBrowserTab: boolean;
  children: React.ReactNode;
}

export function SettingsTabs({ orgId, children }: SettingsTabsProps) {
  const pathname = usePathname() ?? '';
  const { hasPermission } = usePermissions();

  // Pages that handle their own PageLayout (with breadcrumbs)
  const hasOwnLayout =
    pathname.match(new RegExp(`^/${orgId}/settings/roles/(?:new|[^/]+)$`)) !== null;

  if (hasOwnLayout) {
    return <>{children}</>;
  }

  const title = (() => {
    if (pathname === `/${orgId}/settings`) return 'General Settings';
    if (pathname.startsWith(`/${orgId}/settings/context-hub`)) return 'Context';
    if (pathname.startsWith(`/${orgId}/settings/portal`)) return 'Employee Portal';
    if (pathname.startsWith(`/${orgId}/settings/api-keys`)) return 'API Keys';
    if (pathname.startsWith(`/${orgId}/settings/secrets`)) return 'Secrets';
    if (pathname.startsWith(`/${orgId}/settings/roles`)) return 'Roles';
    if (pathname.startsWith(`/${orgId}/settings/notifications`)) return 'Notifications';
    if (pathname.startsWith(`/${orgId}/settings/browser-connection`)) return 'Browser';
    if (pathname.startsWith(`/${orgId}/settings/user`)) return 'User Settings';
    return 'Settings';
  })();

  const isSecretsPage = pathname.startsWith(`/${orgId}/settings/secrets`);

  return (
    <PageLayout
      header={
        <PageHeader
          title={title}
          actions={isSecretsPage && hasPermission('organization', 'update') ? <AddSecretDialog /> : undefined}
        />
      }
    >
      {children}
    </PageLayout>
  );
}
