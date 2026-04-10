import { filterComplianceMembers } from '@/lib/compliance';
import { HIPAA_TRAINING_ID } from '@/lib/data/hipaa-training-content';
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

export interface TaskCompletion {
  completed: number;
  total: number;
  policies: { completed: number; total: number };
  training: { completed: number; total: number };
  hipaa?: { completed: number; total: number };
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
  const taskCompletionMap: Record<string, TaskCompletion> = {};

  const employeeMembers = await filterComplianceMembers(members, organizationId);

  // Build device status map: compliant / non-compliant / not-installed.
  // Device-agent takes priority — if a member has both, the newer agent wins.
  const memberIds = members.map((m) => m.id);
  const devicesForMembers = await db.device.findMany({
    where: {
      organizationId,
      memberId: { in: memberIds },
    },
    select: { memberId: true, isCompliant: true },
  });

  const deviceStatusMap: Record<string, 'compliant' | 'non-compliant' | 'not-installed'> = {};

  // Group device-agent results by member — compliant only if ALL devices pass
  const complianceByMember = new Map<string, boolean>();
  for (const d of devicesForMembers) {
    const prev = complianceByMember.get(d.memberId);
    complianceByMember.set(d.memberId, (prev ?? true) && d.isCompliant);
  }
  for (const [memberId, allCompliant] of complianceByMember) {
    deviceStatusMap[memberId] = allCompliant ? 'compliant' : 'non-compliant';
  }

  // Fleet-only members: have fleetDmLabelId but no device-agent device
  const fleetOnlyMembers = members.filter(
    (m) => m.fleetDmLabelId && !complianceByMember.has(m.id),
  );
  if (fleetOnlyMembers.length > 0) {
    const fleetUserIds = fleetOnlyMembers.map((m) => m.userId);
    const policyResults = await db.fleetPolicyResult.findMany({
      where: { organizationId, userId: { in: fleetUserIds } },
      select: { userId: true, fleetPolicyResponse: true },
    });

    // Group by userId — compliant only if every policy passes
    const fleetComplianceByUser = new Map<string, boolean>();
    for (const r of policyResults) {
      const prev = fleetComplianceByUser.get(r.userId);
      fleetComplianceByUser.set(
        r.userId,
        (prev ?? true) && r.fleetPolicyResponse === 'pass',
      );
    }

    for (const m of fleetOnlyMembers) {
      const allPass = fleetComplianceByUser.get(m.userId);
      // If we have policy results, use them; if fleet is configured but no results yet, non-compliant
      deviceStatusMap[m.id] = allPass === true ? 'compliant' : 'non-compliant';
    }
  }

  if (employeeMembers.length > 0) {
    const [org, hipaaInstance] = await Promise.all([
      db.organization.findUnique({
        where: { id: organizationId },
        select: { securityTrainingStepEnabled: true },
      }),
      db.frameworkInstance.findFirst({
        where: { organizationId, framework: { name: 'HIPAA' } },
        select: { id: true },
      }),
    ]);
    const hasHipaaFramework = !!hipaaInstance;

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
    const totalHipaaTraining = hasHipaaFramework ? 1 : 0;
    const totalTasks = totalPolicies + totalTrainingVideos + totalHipaaTraining;

    for (const employee of employeeMembers) {
      const policiesCompleted = policies.filter((p) => p.signedBy.includes(employee.id)).length;

      const trainingsCompleted = org?.securityTrainingStepEnabled
        ? trainingCompletions.filter(
            (tc) =>
              tc.memberId === employee.id &&
              tc.completedAt !== null &&
              tc.videoId !== HIPAA_TRAINING_ID,
          ).length
        : 0;

      const hipaaCompleted =
        hasHipaaFramework &&
        trainingCompletions.some(
          (tc) =>
            tc.memberId === employee.id &&
            tc.videoId === HIPAA_TRAINING_ID &&
            tc.completedAt !== null,
        )
          ? 1
          : 0;

      taskCompletionMap[employee.id] = {
        completed: policiesCompleted + trainingsCompleted + hipaaCompleted,
        total: totalTasks,
        policies: { completed: policiesCompleted, total: totalPolicies },
        training: { completed: trainingsCompleted, total: totalTrainingVideos },
        ...(hasHipaaFramework && {
          hipaa: { completed: hipaaCompleted, total: 1 },
        }),
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
      deviceStatusMap={deviceStatusMap}
    />
  );
}
