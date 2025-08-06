'use client';

import { Mail, Search, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/utils/auth-client';
import { T, useGT } from 'gt-next';
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

import { InviteMembersModal } from './InviteMembersModal';

// Define prop types using typeof for the actions still used
interface TeamMembersClientProps {
  data: TeamMembersData;
  organizationId: string;
  removeMemberAction: typeof removeMember;
  revokeInvitationAction: typeof revokeInvitation;
}

// Define a simplified type for merged list items
interface DisplayItem extends Partial<MemberWithUser>, Partial<Invitation> {
  type: 'member' | 'invitation';
  displayName: string;
  displayEmail: string;
  displayRole: string | string[]; // Simplified role display, could be comma-separated
  displayStatus: 'active' | 'pending';
  displayId: string; // Use member.id or invitation.id
  processedRoles: Role[];
}

export function TeamMembersClient({
  data,
  organizationId,
  removeMemberAction,
  revokeInvitationAction,
}: TeamMembersClientProps) {
  const t = useGT();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useQueryState('search', parseAsString.withDefault(''));
  const [roleFilter, setRoleFilter] = useQueryState('role', parseAsString.withDefault('all'));

  // Add state for the modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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
        displayStatus: 'active' as const,
        displayId: member.id,
        // Add processed roles for rendering
        processedRoles: roles,
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

    const matchesRole =
      roleFilter === 'all' ||
      (item.type === 'member' && item.role === roleFilter) ||
      (item.type === 'invitation' && item.role === roleFilter);

    return matchesSearch && matchesRole;
  });

  const activeMembers = filteredItems.filter((item) => item.type === 'member');
  const pendingInvites = filteredItems.filter((item) => item.type === 'invitation');

  const handleCancelInvitation = async (invitationId: string) => {
    const result = await revokeInvitationAction({ invitationId });
    if (result?.data) {
      // Success case
      // Data revalidates server-side via action's revalidatePath
      router.refresh(); // Add client-side refresh as well
    } else {
      // Error case
      const errorMessage = result?.serverError || t('Failed to add user');
      console.error('Cancel Invitation Error:', errorMessage);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const result = await removeMemberAction({ memberId });
    if (result?.data) {
      // Success case
      toast.success(t('has been removed from the organization'));
      router.refresh(); // Add client-side refresh as well
    } else {
      // Error case
      const errorMessage = result?.serverError || t('Failed to remove member');
      console.error('Remove Member Error:', errorMessage);
      toast.error(errorMessage);
    }
  };

  // Update handleUpdateRole to use authClient and add toasts
  const handleUpdateRole = async (memberId: string, roles: Role[]) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const member = data.members.find((m) => m.id === memberId);

    // Client-side check (optional, robust check should be server-side in authClient)
    if (member && member.role === 'owner' && !rolesArray.includes('owner')) {
      // Show toast error directly, no need to return an error object
      toast.error(t('The Owner role cannot be removed.'));
      return;
    }

    // Ensure at least one role is selected
    if (rolesArray.length === 0) {
      toast.warning(t('Please select at least one role.'));
      return;
    }

    try {
      // Use authClient directly
      await authClient.organization.updateMemberRole({
        memberId: memberId,
        role: rolesArray, // Pass the array of roles
      });
      toast.success(t('Member roles updated successfully.'));
      router.refresh(); // Revalidate data
    } catch (error) {
      console.error('Update Role Error:', error);
      // Attempt to get a meaningful error message from the caught error

      if (error instanceof Error) {
        toast.error(error.message);
        return;
      }
      toast.error(t('Failed to update member roles'));
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
            placeholder={t('Search people...')}
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
        {/* Role Filter Select: Hidden on mobile, block on sm+ */}
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value === 'all' ? null : value)}
        >
          <SelectTrigger className="hidden w-[180px] sm:flex">
            <SelectValue placeholder={t('All Roles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all"><T>All Roles</T></SelectItem>
            <SelectItem value="owner"><T>Owner</T></SelectItem>
            <SelectItem value="admin"><T>Admin</T></SelectItem>
            <SelectItem value="auditor"><T>Auditor</T></SelectItem>
            <SelectItem value="employee"><T>Employee</T></SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="h-4 w-4" />
          <T>Add User</T>
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
                onUpdateRole={handleUpdateRole}
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
                />
              ))}
            </div>
          )}

          {activeMembers.length === 0 && pendingInvites.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="text-muted-foreground/30 h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium"><T>No employees yet</T></h3>
              <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                <T>Get started by inviting your first team member.</T>
              </p>
              <Button className="mt-4" onClick={() => setIsInviteModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                <T>Add User</T>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
