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
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { InviteMembersModal } from '../all/components/InviteMembersModal';

interface PeoplePageTabsProps {
  peopleContent: ReactNode;
  employeeTasksContent: ReactNode | null;
  devicesContent: ReactNode;
  orgChartContent: ReactNode;
  findingsContent: ReactNode;
  roleMappingContent: ReactNode | null;
  showRoleMapping: boolean;
  showEmployeeTasks: boolean;
  canInviteUsers: boolean;
  canManageMembers: boolean;
  organizationId: string;
}

/** ?tab= value → Radix tab value */
function tabParamToInternal(
  tabParam: string | null,
  showEmployeeTasks: boolean,
  showRoleMapping: boolean,
): string {
  if (!tabParam || tabParam === 'people') {
    return 'people';
  }
  if (tabParam === 'tasks') {
    return showEmployeeTasks ? 'employee-tasks' : 'people';
  }
  if (tabParam === 'devices') {
    return 'devices';
  }
  if (tabParam === 'chart') {
    return 'org-chart';
  }
  if (tabParam === 'findings') {
    return 'findings';
  }
  if (tabParam === 'role-mapping') {
    return showRoleMapping ? 'role-mapping' : 'people';
  }
  return 'people';
}

export function PeoplePageTabs({
  peopleContent,
  employeeTasksContent,
  devicesContent,
  orgChartContent,
  roleMappingContent,
  findingsContent,
  showRoleMapping,
  showEmployeeTasks,
  canInviteUsers,
  canManageMembers,
  organizationId,
}: PeoplePageTabsProps) {
  const searchParams = useSearchParams();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const defaultTab = tabParamToInternal(
    searchParams.get('tab'),
    showEmployeeTasks,
    showRoleMapping,
  );

  return (
    <Tabs defaultValue={defaultTab}>
      <PageLayout
        header={
          <PageHeader
            title="People"
            tabs={
              <TabsList variant="underline">
                <TabsTrigger value="people">People</TabsTrigger>
                {showEmployeeTasks && <TabsTrigger value="employee-tasks">Tasks</TabsTrigger>}
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="org-chart">Chart</TabsTrigger>
                <TabsTrigger value="findings">Findings</TabsTrigger>
                {showRoleMapping && <TabsTrigger value="role-mapping">Role Mapping</TabsTrigger>}
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
        {showEmployeeTasks && (
          <TabsContent value="employee-tasks">{employeeTasksContent}</TabsContent>
        )}
        <TabsContent value="devices">{devicesContent}</TabsContent>
        <TabsContent value="org-chart">{orgChartContent}</TabsContent>
        {showRoleMapping && (
          <TabsContent value="role-mapping">{roleMappingContent}</TabsContent>
        )}
        <TabsContent value="findings">{findingsContent}</TabsContent>
      </PageLayout>

      <InviteMembersModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        organizationId={organizationId}
        allowedBuiltInRoles={
          canManageMembers ? ['admin', 'auditor', 'employee', 'contractor'] : ['auditor']
        }
      />
    </Tabs>
  );
}
