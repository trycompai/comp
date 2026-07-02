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
import { Calendar as CalendarIcon, ChevronDown, InProgress, Search } from '@trycompai/design-system/icons';

import { apiClient } from '@/lib/api-client';
import { useMemo } from 'react';
import { useAgentDevices } from '../../devices/hooks/useAgentDevices';
import { useFleetHosts } from '../../devices/hooks/useFleetHosts';
import { buildDisplayItems, filterDisplayItems } from './filter-members';
import { computeDeviceStatusMap } from './compute-device-status-map';
import { MemberRow } from './MemberRow';
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
                {hasOffboardFilter && !statusFilter
                  ? 'All People'
                  : ({ all: 'All People', active: 'Active', pending: 'Pending', deactivated: 'Deactivated' }[statusFilter] ?? 'Active')}
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
        <DateRangeFilter
          label="Onboarded"
          from={onboardFrom}
          to={onboardTo}
          onApply={(from, to) => { setOnboardFrom(from); setOnboardTo(to); setPage(1); }}
          onClear={() => { setOnboardFrom(undefined); setOnboardTo(undefined); setPage(1); }}
        />
        <DateRangeFilter
          label="Offboarded"
          from={offboardFrom}
          to={offboardTo}
          onApply={(from, to) => { setOffboardFrom(from); setOffboardTo(to); setPage(1); }}
          onClear={() => { setOffboardFrom(undefined); setOffboardTo(undefined); setPage(1); }}
        />
        {hasAnyConnection && (
          <div className="flex items-center gap-2">
            <div className="w-fit max-w-[300px]">
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
                <SelectTrigger aria-label="Sync source">
                  {/* Inline "Sync source ·" prefix mirrors the date chips;
                      the aria-label names the combobox for screen readers
                      (comboboxes don't take their name from contents). */}
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-muted-foreground">Sync source</span>
                    <span className="font-medium">·</span>
                    {isSyncing ? (
                      <>
                        <InProgress size={16} className="animate-spin" />
                        Syncing...
                      </>
                    ) : selectedProvider ? (
                      <>
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
                      </>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </div>
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
                  twoFactorStatus={twoFactorStatusMap[(item as MemberWithUser).id]}
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

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This quarter', days: 90 },
  { label: 'This year', days: 365 },
  { label: 'All time', days: 0 },
] as const;

function getPresetRange(days: number): { from: Date | undefined; to: Date | undefined } {
  if (days === 0) return { from: undefined, to: undefined };
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function getActivePresetLabel(from: Date | undefined, to: Date | undefined): string | null {
  if (!from && !to) return 'Any time';
  if (!from || !to) return null;
  const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  const now = new Date();
  const isToToday = Math.abs(to.getTime() - now.getTime()) < 1000 * 60 * 60 * 24;
  if (!isToToday) return null;
  for (const p of PRESETS) {
    if (p.days === 0) continue;
    if (Math.abs(diffDays - p.days) <= 1) return p.label;
  }
  return null;
}

function DateRangeFilter({
  label,
  from,
  to,
  onApply,
  onClear,
}: {
  label: string;
  from: Date | undefined;
  to: Date | undefined;
  onApply: (from: Date | undefined, to: Date | undefined) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(from);
  const [draftTo, setDraftTo] = useState<Date | undefined>(to);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDraftFrom(from);
      setDraftTo(to);
      setActivePreset(getActivePresetLabel(from, to));
    }
    setOpen(isOpen);
  };

  const handlePreset = (days: number, presetLabel: string) => {
    const range = getPresetRange(days);
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setActivePreset(presetLabel);
  };

  const handleApply = () => {
    onApply(draftFrom, draftTo);
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
  };

  const displayLabel = from && to
    ? `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`
    : from
      ? `From ${format(from, 'MMM d, yyyy')}`
      : to
        ? `Until ${format(to, 'MMM d, yyyy')}`
        : 'Any time';

  return (
    <div className="hidden sm:block">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger>
          <div className="border-border bg-background hover:bg-muted flex h-8 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-xs transition-colors cursor-pointer">
            <CalendarIcon size={13} className="text-muted-foreground" />
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">·</span>
            <span className="font-medium">{displayLabel}</span>
            <ChevronDown size={12} className="text-muted-foreground" />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" style={{ width: 'auto' }}>
          <div className="flex w-[380px] flex-col gap-4 p-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {label} between
            </span>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p.days, p.label)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    activePreset === p.label
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Popover open={fromPickerOpen} onOpenChange={setFromPickerOpen}>
                <PopoverTrigger>
                  <div className="border-border bg-muted/50 flex h-10 flex-1 items-center gap-2 rounded-lg border px-3 text-sm cursor-pointer">
                    <CalendarIcon size={14} className="text-muted-foreground" />
                    {draftFrom ? format(draftFrom, 'MMM d, yyyy') : <span className="text-muted-foreground">Start date</span>}
                  </div>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <Calendar
                    mode="single"
                    selected={draftFrom}
                    onSelect={(d) => { setDraftFrom(d ?? undefined); setActivePreset(null); setFromPickerOpen(false); }}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 1}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover open={toPickerOpen} onOpenChange={setToPickerOpen}>
                <PopoverTrigger>
                  <div className="border-border bg-muted/50 flex h-10 flex-1 items-center gap-2 rounded-lg border px-3 text-sm cursor-pointer">
                    <CalendarIcon size={14} className="text-muted-foreground" />
                    {draftTo ? format(draftTo, 'MMM d, yyyy') : <span className="text-muted-foreground">End date</span>}
                  </div>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <Calendar
                    mode="single"
                    selected={draftTo}
                    onSelect={(d) => { setDraftTo(d ?? undefined); setActivePreset(null); setToPickerOpen(false); }}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 1}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <div>
                <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
              </div>
              <div>
                <Button size="sm" onClick={handleApply}>Apply</Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
