'use client';

import Image from 'next/image';
import Link from 'next/link';
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
import { InProgress, Search, SettingsAdjust } from '@trycompai/design-system/icons';

import { apiClient } from '@/lib/api-client';
import { useMemo } from 'react';
import { useAgentDevices } from '../../devices/hooks/useAgentDevices';
import { useFleetHosts } from '../../devices/hooks/useFleetHosts';
import { buildDisplayItems, filterDisplayItems } from './filter-members';
import { computeDeviceStatusMap } from './compute-device-status-map';
import { MemberRow, type RequirementColumnKey } from './MemberRow';
import { PeopleFilters } from './PeopleFilters';
import { PendingInvitationRow } from './PendingInvitationRow';
import { TwoFactorSourceSelector } from './TwoFactorSourceSelector';
import type {
  MemberWithUser,
  TaskCompletion,
  TeamMembersData,
  TwoFactorStatus,
} from './TeamMembers';

import type { EmployeeSyncConnectionsData } from '../data/queries';
import { useEmployeeSync } from '../hooks/useEmployeeSync';

// Sentinel value for the "Don't auto-sync" item in the sync-source dropdown.
// Radix Select items can't have an empty value, so disabling is modeled as a
// distinct option rather than the absence of a selection.
const NO_SYNC_VALUE = '__no_sync__';

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
  twoFactorStatusMap: Record<string, TwoFactorStatus>;
  /** Org-level tracking flags — column visibility never depends on member data. */
  requirementTracking: { policies: boolean; training: boolean; hipaa: boolean };
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
  twoFactorStatusMap,
  requirementTracking,
}: TeamMembersClientProps) {
  const { agentDevices, isLoading: isAgentDevicesLoading } = useAgentDevices();
  const { fleetHosts, isLoading: isFleetHostsLoading } = useFleetHosts();
  const isDeviceStatusLoading = isAgentDevicesLoading || isFleetHostsLoading;

  const deviceStatusMap = useMemo(
    () => computeDeviceStatusMap({ agentDevices, fleetHosts, complianceMemberIds }),
    [agentDevices, fleetHosts, complianceMemberIds],
  );

  // Which requirement columns the table shows, in order. A column only exists
  // when the underlying tracking applies to this org (flag on / framework
  // present / 2FA source configured), so orgs never see empty dash columns.
  const requirementColumns = useMemo<
    Array<{ key: RequirementColumnKey; label: string }>
  >(() => {
    const cols: Array<{ key: RequirementColumnKey; label: string }> = [];
    if (requirementTracking.policies) cols.push({ key: 'policies', label: 'POLICIES' });
    if (requirementTracking.training) cols.push({ key: 'training', label: 'TRAINING' });
    if (requirementTracking.hipaa) cols.push({ key: 'hipaa', label: 'HIPAA' });
    if (complianceMemberIds.length > 0) cols.push({ key: 'device', label: 'DEVICE' });
    if (backgroundCheckStepEnabled)
      cols.push({ key: 'background', label: 'BACKGROUND' });
    if (Object.keys(twoFactorStatusMap).length > 0)
      cols.push({ key: 'twoFactor', label: '2FA' });
    return cols;
  }, [requirementTracking, complianceMemberIds, backgroundCheckStepEnabled, twoFactorStatusMap]);
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
    setSyncProvider,
    hasAnyConnection,
    getProviderName,
    getProviderLogo,
    availableProviders,
  } = useEmployeeSync({ organizationId, initialData: employeeSyncData });

  const lastSyncAt = employeeSyncData.lastSyncAt;
  const nextSyncAt = employeeSyncData.nextSyncAt;
  const [isDisablingSync, setIsDisablingSync] = useState(false);

  const handleEmployeeSync = async (
    provider: string,
  ) => {
    const result = await syncEmployees(provider);
    if (result?.success) {
      router.refresh();
    }
  };

  // Turn off the daily auto-sync without disconnecting the integration (which
  // would also stop its compliance checks). Clears the org's sync provider so
  // the scheduled job skips it; already-imported people are left untouched.
  // Sets a busy flag (mirroring isSyncing) so the dropdown is locked while the
  // request is in flight, preventing an overlapping provider change from racing.
  const handleDisableSync = async () => {
    if (!selectedProvider || isDisablingSync) return;
    setIsDisablingSync(true);
    try {
      await setSyncProvider(null);
    } finally {
      setIsDisablingSync(false);
    }
  };

  const allItems = buildDisplayItems(data);
  const hasOffboardFilter = !!(offboardFrom || offboardTo);
  const effectiveStatusFilter = hasOffboardFilter && !statusFilter ? 'all' : statusFilter;
  const filteredItems = filterDisplayItems({
    items: allItems,
    searchQuery,
    roleFilter,
    statusFilter: effectiveStatusFilter,
  });

  const hasAnyDateFilter = !!(onboardFrom || onboardTo || offboardFrom || offboardTo);

  const dateFilteredItems = filteredItems.filter((item) => {
    if (item.type !== 'member') return !hasAnyDateFilter;
    const member = item as MemberWithUser;

    if (onboardFrom || onboardTo) {
      if (!member.onboardDate) return false;
      const onboard = member.onboardDate;
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

  const handleRemoveMember = async (
    memberId: string,
    options: { skipOffboarding: boolean },
  ) => {
    try {
      await removeMember(memberId, options);
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
      {/* Left = query (search, filters); right = view configuration (data
          sources) — the Linear/Stripe toolbar convention. */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
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
        <PeopleFilters
          statusFilter={statusFilter}
          hasOffboardFilter={hasOffboardFilter}
          onStatusChange={(value) => {
            setStatusFilter(value ?? '');
            setPage(1);
          }}
          roleFilter={roleFilter}
          onRoleChange={(value) => {
            setRoleFilter(value === 'all' ? '' : (value ?? ''));
            setPage(1);
          }}
          onboardFrom={onboardFrom}
          onboardTo={onboardTo}
          onOnboardApply={(from, to) => { setOnboardFrom(from); setOnboardTo(to); setPage(1); }}
          onOnboardClear={() => { setOnboardFrom(undefined); setOnboardTo(undefined); setPage(1); }}
          offboardFrom={offboardFrom}
          offboardTo={offboardTo}
          onOffboardApply={(from, to) => { setOffboardFrom(from); setOffboardTo(to); setPage(1); }}
          onOffboardClear={() => { setOffboardFrom(undefined); setOffboardTo(undefined); setPage(1); }}
        />
        </div>
        {/* Source settings (sync / 2FA) — settings, not filters, so they get
            their own compact popover, symmetric with the Filters button. */}
        <Popover>
          <PopoverTrigger>
            <div className="border-border bg-background hover:bg-muted flex h-8 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm transition-colors">
              <SettingsAdjust size={16} className="text-muted-foreground" />
              Sync settings
            </div>
          </PopoverTrigger>
          <PopoverContent align="end" style={{ width: 'auto' }}>
            <div className="flex w-[280px] flex-col gap-4 p-1.5">
        {!hasAnyConnection && (
          <div className="flex w-full flex-col gap-1">
            <span className="text-xs text-muted-foreground">People</span>
            <Link
              href={`/${organizationId}/integrations`}
              className="border-border text-muted-foreground hover:bg-muted flex h-8 items-center justify-between rounded-md border border-dashed px-3 text-sm transition-colors"
            >
              Connect an integration
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}
        {hasAnyConnection && (
          <div className="flex w-full">
            <div className="flex w-full flex-col gap-1">
              <span id="employee-sync-source-label" className="text-xs text-muted-foreground">
                People
              </span>
              <Select
                onValueChange={(value) => {
                  const provider = String(value);
                  if (!provider) return;
                  if (provider === NO_SYNC_VALUE) {
                    handleDisableSync();
                    return;
                  }
                  handleEmployeeSync(provider);
                }}
                disabled={isSyncing || isDisablingSync || !canManageMembers}
              >
                <SelectTrigger aria-label="Sync people from">
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
                          alt=""
                          width={16}
                          height={16}
                          className="rounded-sm"
                          unoptimized
                        />
                      )}
                      <span className="truncate">{getProviderName(selectedProvider)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not syncing</span>
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
                <Separator />
                <SelectItem value={NO_SYNC_VALUE}>
                  <div className="flex items-center gap-2">
                    <span>Don&apos;t auto-sync</span>
                    {!selectedProvider && (
                      <span className="ml-auto text-xs text-muted-foreground">Active</span>
                    )}
                  </div>
                </SelectItem>
              </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <TwoFactorSourceSelector />
            </div>
          </PopoverContent>
        </Popover>
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
              {requirementColumns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
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
                  twoFactorStatus={twoFactorStatusMap[(item as MemberWithUser).id]}
                  requirementColumns={requirementColumns.map((c) => c.key)}
                />
              ) : (
                <PendingInvitationRow
                  key={item.displayId}
                  requirementColumnCount={requirementColumns.length}
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

