'use client';

import { Loader2, Mail, Search, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Separator } from '@comp/ui/separator';
import type { Invitation, Role } from '@db';

import { MemberRow } from './MemberRow';
import { PendingInvitationRow } from './PendingInvitationRow';
import type { MemberWithUser, TeamMembersData } from './TeamMembers';

// Import the server actions themselves to get their types
import type { removeMember } from '../actions/removeMember';
import type { revokeInvitation } from '../actions/revokeInvitation';

import { usePeopleActions } from '@/hooks/use-people-api';
import type { EmployeeSyncConnectionsData } from '../data/queries';
import { useEmployeeSync } from '../hooks/useEmployeeSync';
import { InviteMembersModal } from './InviteMembersModal';

// Define prop types using typeof for the actions still used
interface TeamMembersClientProps {
  data: TeamMembersData;
  organizationId: string;
  removeMemberAction: typeof removeMember;
  revokeInvitationAction: typeof revokeInvitation;
  canManageMembers: boolean;
  isCurrentUserOwner: boolean;
  employeeSyncData: EmployeeSyncConnectionsData;
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
  data,
  organizationId,
  removeMemberAction,
  revokeInvitationAction,
  canManageMembers,
  isCurrentUserOwner,
  employeeSyncData,
}: TeamMembersClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useQueryState('search', parseAsString.withDefault(''));
  const [roleFilter, setRoleFilter] = useQueryState('role', parseAsString.withDefault('all'));
  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('all'));

  const { unlinkDevice } = usePeopleActions();

  // Add state for the modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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
  } = useEmployeeSync({ organizationId, initialData: employeeSyncData });

  const lastSyncAt = employeeSyncData.lastSyncAt;
  const nextSyncAt = employeeSyncData.nextSyncAt;

  const handleEmployeeSync = async (provider: 'google-workspace' | 'rippling' | 'jumpcloud') => {
    const result = await syncEmployees(provider);
    if (result?.success) {
      router.refresh();
    }
  };

  // Combine and type members and invitations for filtering/display
  const allItems: DisplayItem[] = [
    ...data.members.map((member) => {
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
    ...data.pendingInvitations.map((invitation) => {
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
    const result = await revokeInvitationAction({ invitationId });
    if (result?.data) {
      if (result.data?.error) {
        toast.error(String(result?.data?.error) || 'Failed to cancel invitation');
        return;
      }
      // Success case
      toast.success('Invitation has been cancelled');
      // Data revalidates server-side via action's revalidatePath
      router.refresh(); // Add client-side refresh as well
    } else {
      // Error case
      const errorMessage = result?.serverError || 'Failed to add user';
      console.error('Cancel Invitation Error:', errorMessage);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const result = await removeMemberAction({ memberId });
    if (result?.data?.success) {
      // Success case
      toast.success('has been removed from the organization');
      router.refresh(); // Add client-side refresh as well
    } else {
      // Error case
      const errorMessage = result?.serverError || 'Failed to remove member';
      console.error('Remove Member Error:', errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleRemoveDevice = async (memberId: string) => {
    await unlinkDevice(memberId);
    toast.success('Device unlinked successfully');
    router.refresh(); // Revalidate data to update UI
  };

  // Update handleUpdateRole to use authClient and add toasts
  const handleUpdateRole = async (memberId: string, roles: Role[]) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const member = data.members.find((m) => m.id === memberId);

    // Client-side check (optional, robust check should be server-side in authClient)
    const memberRoles = member?.role?.split(',').map((r) => r.trim()) ?? [];
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
    <div className="">
      {/* Render the Invite Modal */}
      <InviteMembersModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        organizationId={organizationId}
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Input
            placeholder={'Search people...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value || null)}
            leftIcon={<Search size={14} />}
          />
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
            <SelectItem value="owner">{'Owner'}</SelectItem>
            <SelectItem value="admin">{'Admin'}</SelectItem>
            <SelectItem value="auditor">{'Auditor'}</SelectItem>
            <SelectItem value="employee">{'Employee'}</SelectItem>
          </SelectContent>
        </Select>
        {hasAnyConnection && (
          <div className="flex items-center gap-2">
            <Select
              onValueChange={(value) =>
                handleEmployeeSync(value as 'google-workspace' | 'rippling')
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
                <Separator className="my-1" />
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
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={() => setIsInviteModalOpen(true)} disabled={!canManageMembers}>
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
              <Button className="mt-4" onClick={() => setIsInviteModalOpen(true)}>
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
