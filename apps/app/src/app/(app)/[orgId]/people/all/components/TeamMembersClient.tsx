'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

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
} from '@trycompai/design-system';
import { Search } from '@trycompai/design-system/icons';

import { usePermissions } from '@/hooks/use-permissions';
import { MemberRow } from './MemberRow';
import type { CustomRoleOption } from './MultiRoleCombobox';
import { PendingInvitationRow } from './PendingInvitationRow';
import type { MemberWithUser, TeamMembersData } from './TeamMembers';

import type { EmployeeSyncConnectionsData } from '../data/queries';
import { useEmployeeSync } from '../hooks/useEmployeeSync';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { InviteMembersModal } from './InviteMembersModal';

interface TeamMembersClientProps {
  initialData: TeamMembersData;
  organizationId: string;
  canManageMembers: boolean;
  canInviteUsers: boolean;
  isAuditor: boolean;
  isCurrentUserOwner: boolean;
  employeeSyncData: EmployeeSyncConnectionsData;
  customRoles?: CustomRoleOption[];
}

// Define a simplified type for merged list items
interface DisplayItem extends Partial<MemberWithUser>, Partial<Invitation> {
  type: 'member' | 'invitation';
  displayName: string;
  displayEmail: string;
  displayRole: string | string[]; // Simplified role display, could be comma-separated
  displayStatus: 'active' | 'pending' | 'deactivated';
  displayId: string; // Use member.id or invitation.id
  processedRoles: Role[];
  isDeactivated?: boolean;
}

export function TeamMembersClient({
  initialData,
  organizationId,
  canManageMembers: _canManageMembers,
  canInviteUsers: _canInviteUsers,
  isAuditor,
  isCurrentUserOwner,
  employeeSyncData,
  customRoles = [],
}: TeamMembersClientProps) {
  const { hasPermission } = usePermissions();
  const canManageMembers = hasPermission('member', 'update');
  const canInviteUsers = hasPermission('member', 'create');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const {
    members,
    pendingInvitations,
    removeMember,
    removeDevice,
    updateMemberRole,
    cancelInvitation,
    revalidate,
  } = useTeamMembers({ organizationId, initialData });

  // Employee sync hook with server-fetched initial data
  const {
    googleWorkspaceConnectionId,
    ripplingConnectionId,
    jumpcloudConnectionId,
    rampConnectionId,
    selectedProvider,
    isSyncing,
    syncEmployees,
    hasAnyConnection,
    getProviderName,
    getProviderLogo,
  } = useEmployeeSync({ organizationId, initialData: employeeSyncData });

  const lastSyncAt = employeeSyncData.lastSyncAt;
  const nextSyncAt = employeeSyncData.nextSyncAt;

  const handleEmployeeSync = async (
    provider: 'google-workspace' | 'rippling' | 'jumpcloud' | 'ramp',
  ) => {
    const result = await syncEmployees(provider);
    if (result?.success) {
      await revalidate();
    }
  };

  // Combine and type members and invitations for filtering/display
  const allItems: DisplayItem[] = [
    ...members.map((member) => {
      // Process the role to handle comma-separated values
      const roles =
        typeof member.role === 'string' && member.role.includes(',')
          ? (member.role.split(',') as Role[])
          : Array.isArray(member.role)
            ? member.role
            : [member.role as Role];

      const isInactive = member.deactivated || !member.isActive;

      return {
        ...member,
        type: 'member' as const,
        displayName: member.user.name || member.user.email || '',
        displayEmail: member.user.email || '',
        displayRole: member.role, // Keep original for filtering
        displayStatus: isInactive ? ('deactivated' as const) : ('active' as const),
        displayId: member.id,
        // Add processed roles for rendering
        processedRoles: roles,
        isDeactivated: isInactive,
      };
    }),
    ...pendingInvitations.map((invitation) => {
      // Process the role to handle comma-separated values
      const roles =
        typeof invitation.role === 'string' && invitation.role.includes(',')
          ? (invitation.role.split(',') as Role[])
          : Array.isArray(invitation.role)
            ? invitation.role
            : [invitation.role as Role];

      return {
        ...invitation,
        type: 'invitation' as const,
        displayName: invitation.email.split('@')[0], // Or just email
        displayEmail: invitation.email,
        displayRole: invitation.role, // Keep original for filtering
        displayStatus: 'pending' as const,
        displayId: invitation.id,
        // Add processed roles for rendering
        processedRoles: roles,
      };
    }),
  ];

  // All available roles: built-in roles (type-safe from Role enum) + custom roles
  const builtInRoleOptions: { value: Role; label: string }[] = [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Admin' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'employee', label: 'Employee' },
    { value: 'contractor', label: 'Contractor' },
  ] satisfies { value: Role; label: string }[];

  const allRoleOptions = [
    ...builtInRoleOptions,
    ...customRoles.map((role) => ({ value: role.name, label: role.name })),
  ];

  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.displayEmail.toLowerCase().includes(searchQuery.toLowerCase());

    // Check if the role filter matches any of the member's roles
    const matchesRole = !roleFilter || item.processedRoles.includes(roleFilter as Role);

    // Status filter: 'active' shows non-deactivated members + pending invitations
    // 'deactivated' shows only deactivated members
    // empty shows everything
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && item.displayStatus !== 'deactivated') ||
      (statusFilter === 'deactivated' && item.displayStatus === 'deactivated');

    return matchesSearch && matchesRole && matchesStatus;
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
      await cancelInvitation(invitationId);
      toast.success('Invitation has been cancelled');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel invitation';
      console.error('Cancel Invitation Error:', error);
      toast.error(message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      toast.success('Member has been removed from the organization');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      toast.error(errorMessage);
    }
  };

  const handleRemoveDevice = async (memberId: string) => {
    try {
      await removeDevice(memberId);
      toast.success('Device unlinked successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlink device';
      toast.error(errorMessage);
    }
  };

  // Update handleUpdateRole to use the hook mutation
  const handleUpdateRole = async (memberId: string, roles: Role[]) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const member = members.find((m) => m.id === memberId);

    // Client-side check (optional, robust check should be server-side in authClient)
    const memberRoles = member?.role?.split(',').map((r) => r.trim()) ?? [];
    if (member && memberRoles.includes('owner') && !rolesArray.includes('owner')) {
      toast.error('The Owner role cannot be removed.');
      return;
    }

    // Ensure at least one role is selected
    if (rolesArray.length === 0) {
      toast.warning('Please select at least one role.');
      return;
    }

    try {
      await updateMemberRole(memberId, rolesArray);
      toast.success('Member roles updated successfully.');
    } catch (error) {
      console.error('Update Role Error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error('Failed to update member roles');
    }
  };

  return (
    <Stack gap="4">
      {/* Render the Invite Modal */}
      <InviteMembersModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        organizationId={organizationId}
        allowedRoles={
          canManageMembers ? ['admin', 'auditor', 'employee', 'contractor'] : ['auditor']
        }
        customRoles={customRoles}
        onInviteSuccess={revalidate}
      />

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
              setStatusFilter(value === 'all' ? '' : (value ?? ''));
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All People" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              <SelectItem value="active">Active</SelectItem>
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
              {allRoleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasAnyConnection && (
          <div className="w-[200px]">
            <Select
              onValueChange={(value) => {
                if (value) {
                  handleEmployeeSync(
                    value as 'google-workspace' | 'rippling' | 'jumpcloud' | 'ramp',
                  );
                }
              }}
              disabled={isSyncing || !canManageMembers}
            >
              <SelectTrigger>
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : selectedProvider ? (
                  <div className="flex items-center gap-2">
                    <Image
                      src={getProviderLogo(selectedProvider)}
                      alt={getProviderName(selectedProvider)}
                      width={16}
                      height={16}
                      className="rounded-sm"
                      unoptimized
                    />
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
                {rampConnectionId && (
                  <SelectItem value="ramp">
                    <div className="flex items-center gap-2">
                      <Image
                        src={getProviderLogo('ramp')}
                        alt="Ramp"
                        width={16}
                        height={16}
                        className="rounded-sm"
                        unoptimized
                      />
                      Ramp
                      {selectedProvider === 'ramp' && (
                        <span className="ml-auto text-xs text-muted-foreground">Active</span>
                      )}
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
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
              <TableHead>ROLE</TableHead>
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
                  canEdit={canManageMembers}
                  isCurrentUserOwner={isCurrentUserOwner}
                  customRoles={customRoles}
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
