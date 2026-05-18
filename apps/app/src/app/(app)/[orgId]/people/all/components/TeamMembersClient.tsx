'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { format } from 'date-fns';
import { useApi } from '@/hooks/use-api';
import { usePeopleActions } from '@/hooks/use-people-api';
import { parseRolesString } from '@/lib/permissions';
import { authClient } from '@/utils/auth-client';
import useSWR from 'swr';
import type { Invitation } from '@db';
import {
  Button,
  Calendar,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
} from '@trycompai/design-system';
import { Calendar as CalendarIcon, InProgress, Search } from '@trycompai/design-system/icons';

import { apiClient } from '@/lib/api-client';
import { useMemo } from 'react';
import { useAgentDevices } from '../../devices/hooks/useAgentDevices';
import { useFleetHosts } from '../../devices/hooks/useFleetHosts';
import { buildDisplayItems, filterDisplayItems } from './filter-members';
import { computeDeviceStatusMap } from './compute-device-status-map';
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
  isCurrentUserOwner: boolean;
  employeeSyncData: EmployeeSyncConnectionsData;
  taskCompletionMap: Record<string, TaskCompletion>;
  complianceMemberIds: string[];
  backgroundCheckStepEnabled: boolean;
}

export function TeamMembersClient({
  data,
  organizationId,
  canManageMembers,
  isCurrentUserOwner,
  employeeSyncData,
  taskCompletionMap,
  complianceMemberIds,
  backgroundCheckStepEnabled,
}: TeamMembersClientProps) {
  const { agentDevices, isLoading: isAgentDevicesLoading } = useAgentDevices();
  const { fleetHosts, isLoading: isFleetHostsLoading } = useFleetHosts();
  const isDeviceStatusLoading = isAgentDevicesLoading || isFleetHostsLoading;

  const deviceStatusMap = useMemo(
    () => computeDeviceStatusMap({ agentDevices, fleetHosts, complianceMemberIds }),
    [agentDevices, fleetHosts, complianceMemberIds],
  );
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onboardFrom, setOnboardFrom] = useState<Date | undefined>();
  const [onboardTo, setOnboardTo] = useState<Date | undefined>();
  const [offboardFrom, setOffboardFrom] = useState<Date | undefined>();
  const [offboardTo, setOffboardTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const { unlinkDevice, removeMember, reactivateMember, resendPortalInvite } = usePeopleActions();
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

  const dateFilteredItems = filteredItems.filter((item) => {
    if (item.type !== 'member') return true;
    const member = item as MemberWithUser;

    if (onboardFrom || onboardTo) {
      const onboard = member.onboardDate ?? member.createdAt;
      if (!onboard) return false;
      const d = new Date(onboard);
      if (onboardFrom && d < onboardFrom) return false;
      if (onboardTo) {
        const end = new Date(onboardTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }

    if (offboardFrom || offboardTo) {
      if (!member.offboardDate) return false;
      const d = new Date(member.offboardDate);
      if (offboardFrom && d < offboardFrom) return false;
      if (offboardTo) {
        const end = new Date(offboardTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }

    return true;
  });

  const activeMembers = dateFilteredItems.filter((item) => item.type === 'member');
  const pendingInvites = dateFilteredItems.filter((item) => item.type === 'invitation');

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
              <SelectValue placeholder="Active">
                {{ all: 'All People', active: 'Active', pending: 'Pending', deactivated: 'Deactivated' }[statusFilter] ?? 'Active'}
              </SelectValue>
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
              <SelectValue placeholder="All Roles">
                {{ owner: 'Owner', admin: 'Admin', auditor: 'Auditor', employee: 'Employee', contractor: 'Contractor' }[roleFilter] ?? 'All Roles'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="auditor">Auditor</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Onboarded Date Filter */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="whitespace-nowrap text-xs text-muted-foreground">Onboarded</span>
          <DateFilterButton
            value={onboardFrom}
            onChange={(d) => { setOnboardFrom(d); setPage(1); }}
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <DateFilterButton
            value={onboardTo}
            onChange={(d) => { setOnboardTo(d); setPage(1); }}
            placeholder="To"
          />
        </div>
        {/* Offboarded Date Filter */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="whitespace-nowrap text-xs text-muted-foreground">Offboarded</span>
          <DateFilterButton
            value={offboardFrom}
            onChange={(d) => { setOffboardFrom(d); setPage(1); }}
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <DateFilterButton
            value={offboardTo}
            onChange={(d) => { setOffboardTo(d); setPage(1); }}
            placeholder="To"
          />
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
              <TableHead>ONBOARDED</TableHead>
              <TableHead>OFFBOARDED</TableHead>
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
                  onResendPortalInvite={resendPortalInvite}
                  canEdit={canManageMembers}
                  isCurrentUserOwner={isCurrentUserOwner}
                  customRoles={customRoles}
                  taskCompletion={taskCompletionMap[(item as MemberWithUser).id]}
                  deviceStatus={deviceStatusMap[(item as MemberWithUser).id]}
                  isDeviceStatusLoading={isDeviceStatusLoading}
                  backgroundCheckStatus={
                    (item as MemberWithUser).backgroundCheckRequests?.[0]?.status
                  }
                  backgroundCheckStepEnabled={backgroundCheckStepEnabled}
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

function DateFilterButton({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-border bg-background text-foreground hover:bg-muted flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon size={12} className="text-muted-foreground" />
          {value ? format(value, 'MMM d, yyyy') : <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto border bg-background p-0 shadow-md" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date ?? undefined);
            setOpen(false);
          }}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={new Date().getFullYear() + 1}
        />
      </PopoverContent>
    </Popover>
  );
}
