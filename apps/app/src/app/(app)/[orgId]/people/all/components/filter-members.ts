import { parseRolesString } from '@/lib/permissions';
import type { Invitation } from '@db';
import type { MemberWithUser } from './TeamMembers';

export interface DisplayItem extends Partial<MemberWithUser>, Partial<Invitation> {
  type: 'member' | 'invitation';
  displayName: string;
  displayEmail: string;
  displayRole: string | string[];
  displayStatus: 'active' | 'pending' | 'deactivated';
  displayId: string;
  processedRoles: string[];
  isDeactivated?: boolean;
}

export function buildDisplayItems({
  members,
  pendingInvitations,
}: {
  members: MemberWithUser[];
  pendingInvitations: Invitation[];
}): DisplayItem[] {
  return [
    ...members.map((member) => {
      const roles = parseRolesString(member.role);
      const isInactive = member.deactivated || !member.isActive;

      return {
        ...member,
        type: 'member' as const,
        displayName: member.user.name || member.user.email || '',
        displayEmail: member.user.email || '',
        displayRole: member.role,
        displayStatus: isInactive ? ('deactivated' as const) : ('active' as const),
        displayId: member.id,
        processedRoles: roles,
        isDeactivated: isInactive,
      };
    }),
    ...pendingInvitations.map((invitation) => {
      const roles = parseRolesString(invitation.role);

      return {
        ...invitation,
        type: 'invitation' as const,
        displayName: invitation.email.split('@')[0],
        displayEmail: invitation.email,
        displayRole: invitation.role,
        displayStatus: 'pending' as const,
        displayId: invitation.id,
        processedRoles: roles,
      };
    }),
  ];
}

export function filterDisplayItems({
  items,
  searchQuery,
  roleFilter,
  statusFilter,
}: {
  items: DisplayItem[];
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
}): DisplayItem[] {
  return items.filter((item) => {
    const matchesSearch =
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.displayEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = !roleFilter || item.processedRoles.includes(roleFilter);

    // Status filter: by default (no filter), hide deactivated members
    // 'active' explicitly shows only active members
    // 'deactivated' shows only deactivated members
    // 'pending' shows only pending invitations
    // 'all' shows everything
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'deactivated' && item.displayStatus === 'deactivated') ||
      (statusFilter === 'pending' && item.displayStatus === 'pending') ||
      (!statusFilter && item.displayStatus !== 'deactivated') ||
      (statusFilter === 'active' && item.displayStatus === 'active');

    return matchesSearch && matchesRole && matchesStatus;
  });
}
