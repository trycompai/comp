import { filterComplianceMembers } from '@/lib/compliance';
import { trainingVideos as trainingVideosData } from '@/lib/data/training-videos';
import { serverApi } from '@/lib/server-api-client';
import type { Invitation, Member, User } from '@db';
import { db } from '@db/server';
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
  organizationId: string;
}

export async function TeamMembers(props: TeamMembersProps) {
  const { canManageMembers, canInviteUsers, isAuditor, isCurrentUserOwner, organizationId } = props;

  if (!organizationId) {
    return null;
  }

  // Fetch members and invitations from API
  const [membersRes, invitationsRes] = await Promise.all([
    serverApi.get<{ data: MemberWithUser[]; count: number }>(
      '/v1/people?includeDeactivated=true',
    ),
    serverApi.get<{ data: Invitation[] }>('/v1/auth/invitations'),
  ]);

  const members: MemberWithUser[] = Array.isArray(membersRes.data?.data)
    ? membersRes.data.data
    : [];
  const pendingInvitations: Invitation[] = Array.isArray(invitationsRes.data?.data)
    ? invitationsRes.data.data
    : [];

  const data: TeamMembersData = { members, pendingInvitations };

  // Fetch employee sync connections server-side
  const employeeSyncData = await getEmployeeSyncConnections(organizationId);

  // Build task completion map for employees/contractors
  const taskCompletionMap: Record<string, { completed: number; total: number }> = {};

  const employeeMembers = await filterComplianceMembers(members, organizationId);

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

  if (employeeMembers.length > 0) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { securityTrainingStepEnabled: true },
    });

    const policies = await db.policy.findMany({
      where: {
        organizationId,
        isRequiredToSign: true,
        status: 'published',
        isArchived: false,
      },
    });

    const employeeIds = employeeMembers.map((m) => m.id);
    const trainingCompletions = org?.securityTrainingStepEnabled
      ? await db.employeeTrainingVideoCompletion.findMany({
          where: { memberId: { in: employeeIds } },
        })
      : [];

    const totalPolicies = policies.length;
    const totalTrainingVideos = org?.securityTrainingStepEnabled ? trainingVideosData.length : 0;
    const totalTasks = totalPolicies + totalTrainingVideos;

    for (const employee of employeeMembers) {
      const policiesCompleted = policies.filter((p) => p.signedBy.includes(employee.id)).length;

      const trainingsCompleted = org?.securityTrainingStepEnabled
        ? trainingCompletions.filter(
            (tc) => tc.memberId === employee.id && tc.completedAt !== null,
          ).length
        : 0;

      taskCompletionMap[employee.id] = {
        completed: policiesCompleted + trainingsCompleted,
        total: totalTasks,
      };
    }
  }

  return (
    <TeamMembersClient
      data={data}
      organizationId={organizationId}
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
