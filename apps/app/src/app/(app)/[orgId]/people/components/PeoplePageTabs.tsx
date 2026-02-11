'use client';

import {
  Button,
  PageHeader,
  PageLayout,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { InviteMembersModal } from '../all/components/InviteMembersModal';

interface PeoplePageTabsProps {
  peopleContent: ReactNode;
  devicesContent: ReactNode;
  canInviteUsers: boolean;
  canManageMembers: boolean;
  organizationId: string;
}

export function PeoplePageTabs({
  peopleContent,
  devicesContent,
  canInviteUsers,
  canManageMembers,
  organizationId,
}: PeoplePageTabsProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  return (
    <Tabs defaultValue="people">
      <PageLayout
        header={
          <PageHeader
            title="People"
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="people">People</TabsTrigger>
                <TabsTrigger value="devices">Employee Devices</TabsTrigger>
              </TabsList>
            }
            actions={
              <Button
                iconLeft={<Add size={16} />}
                onClick={() => setIsInviteModalOpen(true)}
                disabled={!canInviteUsers}
              >
                Add User
              </Button>
            }
          />
        }
      >
        <TabsContent value="people">{peopleContent}</TabsContent>
        <TabsContent value="devices">{devicesContent}</TabsContent>
      </PageLayout>

      <InviteMembersModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        organizationId={organizationId}
        allowedRoles={
          canManageMembers ? ['admin', 'auditor', 'employee', 'contractor'] : ['auditor']
        }
      />
    </Tabs>
  );
}
