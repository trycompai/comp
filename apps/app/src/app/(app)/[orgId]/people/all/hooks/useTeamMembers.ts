'use client';

import { apiClient } from '@/lib/api-client';
import { usePeopleActions } from '@/hooks/use-people-api';
import { authClient } from '@/utils/auth-client';
import type { Invitation, Member, Role, User } from '@db';
import { useCallback } from 'react';
import useSWR from 'swr';

export interface MemberWithUser extends Member {
  user: User;
}

export interface TeamMembersData {
  members: MemberWithUser[];
  pendingInvitations: Invitation[];
}

interface PeopleApiResponse {
  data: MemberWithUser[];
  count: number;
}

interface InvitationsApiResponse {
  data: Invitation[];
}

interface UseTeamMembersOptions {
  organizationId: string;
  initialData?: TeamMembersData;
}

async function fetchTeamMembers(): Promise<TeamMembersData> {
  const [membersRes, invitationsRes] = await Promise.all([
    apiClient.get<PeopleApiResponse>('/v1/people?includeDeactivated=true'),
    apiClient.get<InvitationsApiResponse>('/v1/auth/invitations'),
  ]);

  const members = Array.isArray(membersRes.data?.data)
    ? membersRes.data.data
    : [];

  // Handle case where invitations endpoint might not exist yet
  // Fall back to empty array if there's an error
  const pendingInvitations = Array.isArray(invitationsRes.data?.data)
    ? invitationsRes.data.data
    : [];

  return { members, pendingInvitations };
}

export function useTeamMembers({
  organizationId,
  initialData,
}: UseTeamMembersOptions) {
  const { removeMember: removeMemberAction, unlinkDevice } =
    usePeopleActions();

  const { data, error, isLoading, mutate } = useSWR<TeamMembersData>(
    organizationId ? ['team-members', organizationId] : null,
    fetchTeamMembers,
    {
      fallbackData: initialData,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  const members = Array.isArray(data?.members) ? data.members : [];
  const pendingInvitations = Array.isArray(data?.pendingInvitations)
    ? data.pendingInvitations
    : [];

  const removeMember = useCallback(
    async (memberId: string) => {
      await removeMemberAction(memberId);
      await mutate();
    },
    [removeMemberAction, mutate],
  );

  const removeDevice = useCallback(
    async (memberId: string) => {
      await unlinkDevice(memberId);
      await mutate();
    },
    [unlinkDevice, mutate],
  );

  const updateMemberRole = useCallback(
    async (memberId: string, roles: Role[]) => {
      await authClient.organization.updateMemberRole({
        memberId,
        role: roles,
      });
      await mutate();
    },
    [mutate],
  );

  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      const response = await apiClient.delete(
        `/v1/auth/invitations/${invitationId}`,
      );
      if (response.error) {
        throw new Error(response.error);
      }
      await mutate();
    },
    [mutate],
  );

  const revalidate = useCallback(() => mutate(), [mutate]);

  return {
    members,
    pendingInvitations,
    isLoading,
    error,
    removeMember,
    removeDevice,
    updateMemberRole,
    cancelInvitation,
    revalidate,
  };
}
