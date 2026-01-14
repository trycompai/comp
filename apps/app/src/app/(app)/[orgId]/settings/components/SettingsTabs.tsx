'use client';

import { PageHeader, PageLayout, Tabs, TabsList, TabsTrigger } from '@trycompai/design-system';
import { usePathname, useRouter } from 'next/navigation';

interface SettingsTabsProps {
  orgId: string;
  showBrowserTab: boolean;
  children: React.ReactNode;
}

export function SettingsTabs({ orgId, showBrowserTab, children }: SettingsTabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const getTabValue = () => {
    if (pathname === `/${orgId}/settings`) return 'general';
    if (pathname.startsWith(`/${orgId}/settings/context-hub`)) return 'context';
    if (pathname.startsWith(`/${orgId}/settings/api-keys`)) return 'api';
    if (pathname.startsWith(`/${orgId}/settings/secrets`)) return 'secrets';
    if (pathname.startsWith(`/${orgId}/settings/browser-connection`)) return 'browser';
    if (pathname.startsWith(`/${orgId}/settings/user`)) return 'user';
    return 'general';
  };

  const activeTab = getTabValue();

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      general: `/${orgId}/settings`,
      context: `/${orgId}/settings/context-hub`,
      api: `/${orgId}/settings/api-keys`,
      secrets: `/${orgId}/settings/secrets`,
      browser: `/${orgId}/settings/browser-connection`,
      user: `/${orgId}/settings/user`,
    };
    router.push(routes[value]);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageLayout
        header={
          <PageHeader
            title="Settings"
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
                <TabsTrigger value="secrets">Secrets</TabsTrigger>
                {showBrowserTab && <TabsTrigger value="browser">Browser</TabsTrigger>}
                <TabsTrigger value="user">User Settings</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        {children}
      </PageLayout>
    </Tabs>
  );
}
