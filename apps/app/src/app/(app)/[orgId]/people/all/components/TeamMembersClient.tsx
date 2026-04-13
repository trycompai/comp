'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { useApi } from '@/hooks/use-api';
import { usePeopleActions } from '@/hooks/use-people-api';
import { parseRolesString } from '@/lib/permissions';
import { authClient } from '@/utils/auth-client';
import useSWR from 'swr';
import type { Invitation, Role } from '@db';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Stack,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@trycompai/design-system';
import { InProgress, Search } from '@trycompai/design-system/icons';

import { apiClient } from '@/lib/api-client';
import { buildDisplayItems, filterDisplayItems } from './filter-members';
import { MemberRow } from './MemberRow';
import { PendingInvitationRow } from './PendingInvitationRow';
import type { MemberWithUser, TaskCompletion, TeamMembersData } from './TeamMembers';

import type { EmployeeSyncConnectionsData } from '../data/queries';
import { useEmployeeSync } from '../hooks/useEmployeeSync';

interface TeamMembersClientProps {
  data: TeamMembersData;
  organizationId: string;
  canManageMembers: boolean;
  canInviteUsers: boolean;
  isAuditor: boolean;
  isCurrentUserOwner: boolean;
  employeeSyncData: EmployeeSyncConnectionsData;
  taskCompletionMap: Record<string, TaskCompletion>;
  deviceStatusMap: Record<string, 'compliant' | 'non-compliant' | 'not-installed'>;
}

export function TeamMembersClient({
  data,
  organizationId,
  canManageMembers,
  canInviteUsers,
  isAuditor,
  isCurrentUserOwner,
  employeeSyncData,
  taskCompletionMap,
  deviceStatusMap,
}: TeamMembersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const { unlinkDevice, removeMember, reactivateMember } = usePeopleActions();
  const api = useApi();

  // Fetch custom roles for the role combobox
  const { data: rolesData } = useSWR(
    `/v1/roles`,
    async (endpoint: string) => {
      const res = await api.get<{ customRoles: Array<{ id: string; name: string; permissions: Record<string, string[]> }> }>(endpoint);
      return res.data?.customRoles ?? [];
    },
  );
  const customRoles = (rolesData ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    permissions: r.permissions,
  }));

  // Employee sync hook with server-fetched initial data
  const {
    googleWorkspaceConnectionId,
    ripplingConnectionId,
    jumpcloudConnectionId,
    selectedProvider,
    isSyncing,
    syncEmployees,
    hasAnyConnection,
    getProviderName,
    getProviderLogo,
    availableProviders,
  } = useEmployeeSync({ organizationId, initialData: employeeSyncData });

  const lastSyncAt = employeeSyncData.lastSyncAt;
  const nextSyncAt = employeeSyncData.nextSyncAt;

  const handleEmployeeSync = async (
    provider: string,
  ) => {
    const result = await syncEmployees(provider);
    if (result?.success) {
      router.refresh();
    }
  };

  const allItems = buildDisplayItems(data);
  const filteredItems = filterDisplayItems({
    items: allItems,
    searchQuery,
    roleFilter,
    statusFilter,
  });

  const activeMembers = filteredItems.filter((item) => item.type === 'member');
  const pendingInvites = filteredItems.filter((item) => item.type === 'invitation');

  // Combine all items for table display
  const allDisplayItems = [...activeMembers, ...pendingInvites];
  const totalItems = allDisplayItems.length;
  const pageCount = Math.ceil(totalItems / perPage);
  const paginatedItems = allDisplayItems.slice((page - 1) * perPage, page * perPage);

  const pageSizeOptions = [10, 25, 50, 100];

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await apiClient.delete(`/v1/auth/invitations/${invitationId}`);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      toast.success('Invitation has been cancelled');
      router.refresh();
    } catch (error) {
      console.error('Cancel Invitation Error:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast.success('Member has been removed from the organization');
      router.refresh();
    } catch (error) {
      console.error('Remove Member Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const handleReactivateMember = async (memberId: string) => {
    try {
      await reactivateMember(memberId);
      toast.success('Member has been reinstated');
      router.refresh();
    } catch (error) {
      console.error('Reactivate Member Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reinstate member');
    }
  };

  const handleRemoveDevice = async (memberId: string) => {
    await unlinkDevice(memberId);
    toast.success('Device unlinked successfully');
    router.refresh(); // Revalidate data to update UI
  };

  // Update handleUpdateRole to use authClient and add toasts
  const handleUpdateRole = async (memberId: string, roles: string[]) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const member = data.members.find((m) => m.id === memberId);

    // Client-side check (optional, robust check should be server-side in authClient)
    const memberRoles = parseRolesString(member?.role);
    if (member && memberRoles.includes('owner') && !rolesArray.includes('owner')) {
      // Show toast error directly, no need to return an error object
      toast.error('The Owner role cannot be removed.');
      return;
    }

    // Ensure at least one role is selected
    if (rolesArray.length === 0) {
      toast.warning('Please select at least one role.');
      return;
    }

    try {
      // Use authClient directly
      await authClient.organization.updateMemberRole({
        memberId: memberId,
        role: rolesArray, // Pass the array of roles
      });
      toast.success('Member roles updated successfully.');
      router.refresh(); // Revalidate data
    } catch (error) {
      console.error('Update Role Error:', error);
      // Attempt to get a meaningful error message from the caught error

      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error('Failed to update member roles');
    }
  };

  return (
    <Stack gap="4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
        {/* Status Filter Select */}
        <div className="hidden w-[140px] sm:block">
          <Select
            value={statusFilter || undefined}
            onValueChange={(value) => {
              setStatusFilter(value ?? '');
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Active" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Role Filter Select */}
        <div className="hidden w-[180px] sm:block">
          <Select
            value={roleFilter || undefined}
            onValueChange={(value) => {
              setRoleFilter(value === 'all' ? '' : (value ?? ''));
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="auditor">Auditor</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasAnyConnection && (
          <div className="flex items-center gap-2">
            <div className="w-[200px]">
              <Select
                onValueChange={(value) => {
                  if (value) {
                    handleEmployeeSync(
                      value as 'google-workspace' | 'rippling' | 'jumpcloud',
                    );
                  }
                }}
                disabled={isSyncing || !canManageMembers}
              >
                <SelectTrigger>
                  {isSyncing ? (
                    <>
                      <InProgress size={16} className="mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : selectedProvider ? (
                    <div className="flex items-center gap-2">
                      {getProviderLogo(selectedProvider) && (
                        <Image
                          src={getProviderLogo(selectedProvider)}
                          alt={getProviderName(selectedProvider)}
                          width={16}
                          height={16}
                          className="rounded-sm"
                          unoptimized
                        />
                      )}
                      <span className="truncate">{getProviderName(selectedProvider)}</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select sync source" />
                  )}
                </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-1">
                  {selectedProvider ? (
                    <>
                      <div>Auto-syncs daily at 7 AM UTC</div>
                      {lastSyncAt && (
                        <div className="text-xs text-muted-foreground/80">
                          Last sync: {new Date(lastSyncAt).toLocaleString()}
                        </div>
                      )}
                      {nextSyncAt && (
                        <div className="text-xs text-muted-foreground/80">
                          Next sync: {new Date(nextSyncAt).toLocaleString()}
                        </div>
                      )}
                    </>
                  ) : (
                    'Select a provider to enable auto-sync'
                  )}
                </div>
                <Separator />
                {googleWorkspaceConnectionId && (
                  <SelectItem value="google-workspace">
                    <div className="flex items-center gap-2">
                      <Image
                        src={getProviderLogo('google-workspace')}
                        alt="Google"
                        width={16}
                        height={16}
                        className="rounded-sm"
                        unoptimized
                      />
                      Google Workspace
                      {selectedProvider === 'google-workspace' && (
                        <span className="ml-auto text-xs text-muted-foreground">Active</span>
                      )}
                    </div>
                  </SelectItem>
                )}
                {ripplingConnectionId && (
                  <SelectItem value="rippling">
                    <div className="flex items-center gap-2">
                      <Image
                        src={getProviderLogo('rippling')}
                        alt="Rippling"
                        width={16}
                        height={16}
                        className="rounded-sm"
                        unoptimized
                      />
                      Rippling
                      {selectedProvider === 'rippling' && (
                        <span className="ml-auto text-xs text-muted-foreground">Active</span>
                      )}
                    </div>
                  </SelectItem>
                )}
                {jumpcloudConnectionId && (
                  <SelectItem value="jumpcloud">
                    <div className="flex items-center gap-2">
                      <Image
                        src={getProviderLogo('jumpcloud')}
                        alt="JumpCloud"
                        width={16}
                        height={16}
                        className="rounded-sm"
                        unoptimized
                      />
                      JumpCloud
                      {selectedProvider === 'jumpcloud' && (
                        <span className="ml-auto text-xs text-muted-foreground">Active</span>
                      )}
                    </div>
                  </SelectItem>
                )}
                {/* Dynamic sync providers (from dynamic integrations) */}
                {availableProviders
                  .filter((p) => p.connected && !['google-workspace', 'rippling', 'jumpcloud'].includes(p.slug))
                  .map((provider) => (
                    <SelectItem key={provider.slug} value={provider.slug}>
                      <div className="flex items-center gap-2">
                        {provider.logoUrl && (
                          <Image
                            src={provider.logoUrl}
                            alt={provider.name}
                            width={16}
                            height={16}
                            className="rounded-sm"
                            unoptimized
                          />
                        )}
                        {provider.name}
                        {selectedProvider === provider.slug && (
                          <span className="ml-auto text-xs text-muted-foreground">Active</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {totalItems === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{searchQuery ? 'No people found' : 'No employees yet'}</EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? 'Try adjusting your search or filters.'
                : 'Get started by inviting your first team member.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table
          variant="bordered"
          pagination={{
            page,
            pageCount,
            onPageChange: setPage,
            pageSize: perPage,
            pageSizeOptions,
            onPageSizeChange: (size) => {
              setPerPage(size);
              setPage(1);
            },
          }}
        >
          <TableHeader>
            <TableRow>
              <TableHead>NAME</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>
                <div className="w-[160px]">ROLE</div>
              </TableHead>
              <TableHead>DEVICE</TableHead>
              <TableHead>TASKS</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) =>
              item.type === 'member' ? (
                <MemberRow
                  key={item.displayId}
                  member={item as MemberWithUser}
                  onRemove={handleRemoveMember}
                  onRemoveDevice={handleRemoveDevice}
                  onUpdateRole={handleUpdateRole}
                  onReactivate={handleReactivateMember}
                  canEdit={canManageMembers}
                  isCurrentUserOwner={isCurrentUserOwner}
                  customRoles={customRoles}
                  taskCompletion={taskCompletionMap[(item as MemberWithUser).id]}
                  deviceStatus={deviceStatusMap[(item as MemberWithUser).id]}
                />
              ) : (
                <PendingInvitationRow
                  key={item.displayId}
                  invitation={item as Invitation}
                  onCancel={handleCancelInvitation}
                  canCancel={canManageMembers}
                />
              ),
            )}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}
