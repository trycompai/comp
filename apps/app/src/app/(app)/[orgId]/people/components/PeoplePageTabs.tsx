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
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { InviteMembersModal } from '../all/components/InviteMembersModal';

interface PeoplePageTabsProps {
  peopleContent: ReactNode;
  employeeTasksContent: ReactNode | null;
  devicesContent: ReactNode;
  orgChartContent: ReactNode;
  roleMappingContent: ReactNode | null;
  showRoleMapping: boolean;
  showEmployeeTasks: boolean;
  canInviteUsers: boolean;
  canManageMembers: boolean;
  organizationId: string;
}

/** Tab value (Radix) → URL hash fragment (without #) */
function hashForTab(tab: string): string {
  switch (tab) {
    case 'people':
      return 'people';
    case 'employee-tasks':
      return 'tasks';
    case 'devices':
      return 'devices';
    case 'org-chart':
      return 'chart';
    case 'role-mapping':
      return 'role-mapping';
    default:
      return 'people';
  }
}

/** URL hash → tab value; falls back to `people` when missing or unavailable */
function tabFromHash(
  hash: string,
  showEmployeeTasks: boolean,
  showRoleMapping: boolean,
): string {
  const raw = hash.replace(/^#/, '').toLowerCase();
  if (!raw || raw === 'people') {
    return 'people';
  }
  if (raw === 'tasks') {
    return showEmployeeTasks ? 'employee-tasks' : 'people';
  }
  if (raw === 'devices') {
    return 'devices';
  }
  if (raw === 'chart') {
    return 'org-chart';
  }
  if (raw === 'role-mapping') {
    return showRoleMapping ? 'role-mapping' : 'people';
  }
  return 'people';
}

function replaceUrlHash(nextHash: string) {
  const url = `${window.location.pathname}${window.location.search}#${nextHash}`;
  window.history.replaceState(null, '', url);
}

export function PeoplePageTabs({
  peopleContent,
  employeeTasksContent,
  devicesContent,
  orgChartContent,
  roleMappingContent,
  showRoleMapping,
  showEmployeeTasks,
  canInviteUsers,
  canManageMembers,
  organizationId,
}: PeoplePageTabsProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('people');

  const syncFromLocation = useCallback(() => {
    const tab = tabFromHash(window.location.hash, showEmployeeTasks, showRoleMapping);
    setActiveTab(tab);
    const expectedHash = hashForTab(tab);
    const currentRaw = window.location.hash.replace(/^#/, '');
    if (currentRaw !== '' && currentRaw !== expectedHash) {
      replaceUrlHash(expectedHash);
    }
  }, [showEmployeeTasks, showRoleMapping]);

  useLayoutEffect(() => {
    syncFromLocation();
  }, [syncFromLocation]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(tabFromHash(window.location.hash, showEmployeeTasks, showRoleMapping));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [showEmployeeTasks, showRoleMapping]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    replaceUrlHash(hashForTab(value));
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
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
