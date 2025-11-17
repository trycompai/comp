'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { useState } from 'react';
import { GrantsTab } from './grants-tab';
import { RequestsTab } from './request-tab';

export function TrustAccessRequestsClient({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<'requests' | 'grants'>('requests');

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'requests' | 'grants')}>
        <TabsList>
          <TabsTrigger value="requests">Access Requests</TabsTrigger>
          <TabsTrigger value="grants">Granted Access</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <RequestsTab orgId={orgId} />
        </TabsContent>
        <TabsContent value="grants">
          <GrantsTab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
