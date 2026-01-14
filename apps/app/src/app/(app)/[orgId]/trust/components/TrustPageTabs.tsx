'use client';

import {
  PageHeader,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import type { ReactNode } from 'react';

interface TrustPageTabsProps {
  accessRequestsContent: ReactNode;
  portalSettingsContent: ReactNode;
}

export function TrustPageTabs({
  accessRequestsContent,
  portalSettingsContent,
}: TrustPageTabsProps) {
  return (
    <Tabs defaultValue="access-requests">
      <PageLayout
        header={
          <PageHeader
            title="Trust"
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="access-requests">Access Requests</TabsTrigger>
                <TabsTrigger value="portal-settings">Portal Settings</TabsTrigger>
              </TabsList>
            }
          />
        }
      >
        <TabsContent value="access-requests">{accessRequestsContent}</TabsContent>
        <TabsContent value="portal-settings">{portalSettingsContent}</TabsContent>
      </PageLayout>
    </Tabs>
  );
}
