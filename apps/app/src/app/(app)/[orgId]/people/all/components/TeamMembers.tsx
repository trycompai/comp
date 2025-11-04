'use server';

import { auth } from '@/utils/auth';
import type { Invitation, Member, User } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';
import { removeMember } from '../actions/removeMember';
import { revokeInvitation } from '../actions/revokeInvitation';
import { TeamMembersClient } from './TeamMembersClient';

export interface MemberWithUser extends Member {
  user: User;
}

export interface TeamMembersData {
  members: MemberWithUser[];
  pendingInvitations: Invitation[];
}

export async function TeamMembers() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const organizationId = session?.session?.activeOrganizationId;

  if (!organizationId) {
    return null;
  }

  const currentUserMember = await db.member.findFirst({
    where: {
      organizationId: organizationId,
      userId: session?.user.id,
    },
  });

  // Parse roles from comma-separated string and check if user has admin or owner role
  const currentUserRoles = currentUserMember?.role?.split(',').map((r) => r.trim()) ?? [];
  const canManageMembers = currentUserRoles.some((role) => ['owner', 'admin'].includes(role));

  let members: MemberWithUser[] = [];
  let pendingInvitations: Invitation[] = [];

  if (organizationId) {
    const fetchedMembers = await db.member.findMany({
      where: {
        organizationId: organizationId,
        deactivated: false,
      },
      include: {
        user: true,
      },
      orderBy: {
        user: {
          email: 'asc',
        },
      },
    });

    members = fetchedMembers;

    pendingInvitations = await db.invitation.findMany({
      where: {
        organizationId,
        status: 'pending',
      },
      orderBy: {
        email: 'asc',
      },
    });
  }

  const data: TeamMembersData = {
    members: members,
    pendingInvitations: pendingInvitations,
  };

  return (
    <TeamMembersClient
      data={data}
      organizationId={organizationId ?? ''}
      removeMemberAction={removeMember}
      revokeInvitationAction={revokeInvitation}
      canManageMembers={canManageMembers}
    />
  );
}
