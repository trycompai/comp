'use client';

import Image from 'next/image';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { RampRoleMappingContent } from './RampRoleMappingContent';

const PROVIDER_LOGOS = {
  ramp: 'https://img.logo.dev/ramp.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
} as const;

interface RoleMappingTabProps {
  organizationId: string;
  rampConnectionId: string | null;
}

export function RoleMappingTab({
  organizationId,
  rampConnectionId,
}: RoleMappingTabProps) {
  if (!rampConnectionId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No sync providers connected</EmptyTitle>
          <EmptyDescription>
            Connect a provider like Ramp in Integrations to configure role
            mapping.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Tabs defaultValue="ramp">
      <div className="mb-4 -ml-1">
        <TabsList variant="default">
          <TabsTrigger value="ramp">
            <Image
              src={PROVIDER_LOGOS.ramp}
              alt="Ramp"
              width={16}
              height={16}
              className="rounded-sm"
              unoptimized
            />
            Ramp
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="ramp">
        <RampRoleMappingContent
          organizationId={organizationId}
          connectionId={rampConnectionId}
        />
      </TabsContent>
    </Tabs>
  );
}
