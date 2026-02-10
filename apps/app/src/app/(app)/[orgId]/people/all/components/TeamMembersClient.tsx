'use client';

import { Loader2, Mail, Search, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { Invitation, Role } from '@db';
import { InputGroup, InputGroupAddon, InputGroupInput, Separator } from '@trycompai/design-system';

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

  const [searchQuery, setSearchQuery] = useQueryState('search', parseAsString.withDefault(''));
  const [roleFilter, setRoleFilter] = useQueryState('role', parseAsString.withDefault('all'));
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('all'));

  const {
    members,
    pendingInvitations,
    removeMember,
    removeDevice,
    updateMemberRole,
    cancelInvitation,
    revalidate,
  } = useTeamMembers({ organizationId, initialData });

  // Add state for the modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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

      return {
        ...member,
        type: 'member' as const,
        displayName: member.user.name || member.user.email || '',
        displayEmail: member.user.email || '',
        displayRole: member.role, // Keep original for filtering
        displayStatus: member.deactivated ? ('deactivated' as const) : ('active' as const),
        displayId: member.id,
        // Add processed roles for rendering
        processedRoles: roles,
        isDeactivated: member.deactivated,
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
    const matchesRole = roleFilter === 'all' || item.processedRoles.includes(roleFilter as Role);

    // Status filter: 'active' shows non-deactivated members + pending invitations
    // 'deactivated' shows only deactivated members
    // 'all' shows everything
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.displayStatus !== 'deactivated') ||
      (statusFilter === 'deactivated' && item.displayStatus === 'deactivated');

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeMembers = filteredItems.filter((item) => item.type === 'member');
  const pendingInvites = filteredItems.filter((item) => item.type === 'invitation');

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
    <div className="">
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

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value || null)}
            />
          </InputGroup>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-7 w-7 p-0"
              onClick={() => setSearchQuery(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* Status Filter Select */}
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}
        >
          <SelectTrigger className="hidden w-[140px] sm:flex">
            <SelectValue placeholder={'All People'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{'All People'}</SelectItem>
            <SelectItem value="active">{'Active'}</SelectItem>
            <SelectItem value="deactivated">{'Deactivated'}</SelectItem>
          </SelectContent>
        </Select>
        {/* Role Filter Select: Hidden on mobile, block on sm+ */}
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value === 'all' ? null : value)}
        >
          <SelectTrigger className="hidden w-[180px] sm:flex">
            <SelectValue placeholder={'All Roles'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{'All Roles'}</SelectItem>
            {allRoleOptions.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasAnyConnection && (
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(value) =>
                handleEmployeeSync(value as 'google-workspace' | 'rippling' | 'jumpcloud' | 'ramp')
              }
              disabled={isSyncing || !canManageMembers}
            >
              <SelectTrigger className="w-[200px]">
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
                <div className="my-1">
                  <Separator />
                </div>
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
        <Button onClick={() => setIsInviteModalOpen(true)} disabled={!canInviteUsers}>
          <UserPlus className="h-4 w-4" />
          {'Add User'}
        </Button>
      </div>
      <Card className="border">
        <CardContent className="p-0">
          <div className="divide-y">
            {activeMembers.map((member) => (
              <MemberRow
                key={member.displayId}
                member={member as MemberWithUser}
                onRemove={handleRemoveMember}
                onRemoveDevice={handleRemoveDevice}
                onUpdateRole={handleUpdateRole}
                canEdit={canManageMembers}
                isCurrentUserOwner={isCurrentUserOwner}
                customRoles={customRoles}
              />
            ))}
          </div>

          {/* Conditionally render separator only if both sections have content */}
          {activeMembers.length > 0 && pendingInvites.length > 0 && <Separator />}

          {pendingInvites.length > 0 && (
            <div className="divide-y">
              {pendingInvites.map((invitation) => (
                <PendingInvitationRow
                  key={invitation.displayId}
                  invitation={invitation as Invitation}
                  onCancel={handleCancelInvitation}
                  canCancel={canManageMembers}
                />
              ))}
            </div>
          )}

          {activeMembers.length === 0 && pendingInvites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="text-muted-foreground/30 h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium">{'No employees yet'}</h3>
              <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                {'Get started by inviting your first team member.'}
              </p>
              <Button
                className="mt-4"
                onClick={() => setIsInviteModalOpen(true)}
                disabled={!canInviteUsers}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {'Add User'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
