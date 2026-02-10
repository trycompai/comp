'use server';

import { serverApi } from '@/lib/api-server';
import type { Invitation, Member, User } from '@db';
import { getEmployeeSyncConnections } from '../data/queries';
import { TeamMembersClient } from './TeamMembersClient';
import type { CustomRoleOption } from './MultiRoleCombobox';

export interface MemberWithUser extends Member {
  user: User;
}

export interface TeamMembersData {
  members: MemberWithUser[];
  pendingInvitations: Invitation[];
}

export interface TeamMembersProps {
  canManageMembers: boolean;
  canInviteUsers: boolean;
  isAuditor: boolean;
  isCurrentUserOwner: boolean;
}

interface PeopleMember extends Member {
  user: User;
}

interface PeopleApiResponse {
  data: PeopleMember[];
  count: number;
}

interface InvitationsApiResponse {
  data: Invitation[];
}

interface RolesApiResponse {
  customRoles: Array<{
    id: string;
    name: string;
    permissions: Record<string, string[]>;
    isBuiltIn: boolean;
  }>;
}

export async function TeamMembers(props: TeamMembersProps) {
  const { canManageMembers, canInviteUsers, isAuditor, isCurrentUserOwner } = props;

  // Fetch members, roles, invitations, and sync data via API
  const [membersResponse, rolesResponse, invitationsResponse] = await Promise.all([
    serverApi.get<PeopleApiResponse>('/v1/people?includeDeactivated=true'),
    serverApi.get<RolesApiResponse>('/v1/roles'),
    serverApi.get<InvitationsApiResponse>('/v1/auth/invitations'),
  ]);

  if (!membersResponse.data) {
    return null;
  }

  const members = membersResponse.data.data ?? [];
  const organizationId = members[0]?.organizationId ?? '';

  const pendingInvitations: Invitation[] = Array.isArray(invitationsResponse.data?.data)
    ? invitationsResponse.data.data
    : [];

  const initialData: TeamMembersData = { members, pendingInvitations };

  const employeeSyncData = await getEmployeeSyncConnections(organizationId);

  const customRoles: CustomRoleOption[] = (
    rolesResponse.data?.customRoles ?? []
  ).map((role) => ({
    id: role.id,
    name: role.name,
    permissions: role.permissions,
  }));

  return (
    <TeamMembersClient
      initialData={initialData}
      organizationId={organizationId}
      canManageMembers={canManageMembers}
      canInviteUsers={canInviteUsers}
      isAuditor={isAuditor}
      isCurrentUserOwner={isCurrentUserOwner}
      employeeSyncData={employeeSyncData}
      customRoles={customRoles}
    />
  );
}
