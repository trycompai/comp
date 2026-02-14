'use server';

import { trainingVideos as trainingVideosData } from '@/lib/data/training-videos';
import { auth } from '@/utils/auth';
import type { Invitation, Member, User } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';
import { removeMember } from '../actions/removeMember';
import { revokeInvitation } from '../actions/revokeInvitation';
import { getEmployeeSyncConnections } from '../data/queries';
import { TeamMembersClient } from './TeamMembersClient';

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

export async function TeamMembers(props: TeamMembersProps) {
  const { canManageMembers, canInviteUsers, isAuditor, isCurrentUserOwner } = props;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const organizationId = session?.session?.activeOrganizationId;

  if (!organizationId) {
    return null;
  }

  let members: MemberWithUser[] = [];
  let pendingInvitations: Invitation[] = [];

  if (organizationId) {
    // Fetch all members including deactivated ones
    const fetchedMembers = await db.member.findMany({
      where: {
        organizationId: organizationId,
      },
      include: {
        user: true,
      },
      orderBy: [
        { deactivated: 'asc' }, // Active members first
        { user: { email: 'asc' } },
      ],
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

  // Fetch employee sync connections server-side
  const employeeSyncData = await getEmployeeSyncConnections(organizationId);

  // Build task completion map for employees/contractors
  const taskCompletionMap: Record<string, { completed: number; total: number }> = {};

  const employeeMembers = members.filter((member) => {
    const roles = member.role.includes(',')
      ? member.role.split(',').map((r) => r.trim())
      : [member.role];
    return roles.includes('employee') || roles.includes('contractor');
  });

  if (employeeMembers.length > 0) {
    // Fetch required policies
    const policies = await db.policy.findMany({
      where: {
        organizationId,
        isRequiredToSign: true,
        status: 'published',
        isArchived: false,
      },
    });

    // Fetch training video completions
    const employeeIds = employeeMembers.map((m) => m.id);
    const trainingCompletions = await db.employeeTrainingVideoCompletion.findMany({
      where: {
        memberId: { in: employeeIds },
      },
    });

    const totalTrainingVideos = trainingVideosData.length;
    const totalPolicies = policies.length;
    const totalTasks = totalPolicies + totalTrainingVideos;

    for (const employee of employeeMembers) {
      const policiesCompleted = policies.filter((p) => p.signedBy.includes(employee.id)).length;

      const trainingsCompleted = trainingCompletions.filter(
        (tc) => tc.memberId === employee.id && tc.completedAt !== null,
      ).length;

      taskCompletionMap[employee.id] = {
        completed: policiesCompleted + trainingsCompleted,
        total: totalTasks,
      };
    }
  }

  // Build a set of member IDs that have device-agent devices
  const memberIds = members.map((m) => m.id);
  const devicesForMembers = await db.device.findMany({
    where: {
      organizationId,
      memberId: { in: memberIds },
    },
    select: { memberId: true },
  });
  const memberIdsWithDeviceAgent = [
    ...new Set(devicesForMembers.map((d) => d.memberId)),
  ];

  return (
    <TeamMembersClient
      data={data}
      organizationId={organizationId ?? ''}
      removeMemberAction={removeMember}
      revokeInvitationAction={revokeInvitation}
      canManageMembers={canManageMembers}
      canInviteUsers={canInviteUsers}
      isAuditor={isAuditor}
      isCurrentUserOwner={isCurrentUserOwner}
      employeeSyncData={employeeSyncData}
      taskCompletionMap={taskCompletionMap}
      memberIdsWithDeviceAgent={memberIdsWithDeviceAgent}
    />
  );
}
