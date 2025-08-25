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
  const organizationId = session?.session.activeOrganizationId;

  const currentUserMember = await db.member.findFirst({
    where: {
      organizationId: session?.session.activeOrganizationId,
      userId: session?.user.id,
    },
  });

  const canManageMembers = ['owner', 'admin'].includes(currentUserMember?.role ?? '');

  let members: MemberWithUser[] = [];
  let pendingInvitations: Invitation[] = [];

  if (organizationId) {
    const fetchedMembers = await db.member.findMany({
      where: {
        organizationId: organizationId,
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
