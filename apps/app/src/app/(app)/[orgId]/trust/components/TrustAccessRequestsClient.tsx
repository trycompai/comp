'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/ui/tabs';
import { RequestsTab } from './RequestsTab';
import { GrantsTab } from './GrantsTab';

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
