import { filterComplianceMembers } from '@/lib/compliance';
import { HIPAA_TRAINING_ID } from '@/lib/data/hipaa-training-content';
import { trainingVideos as trainingVideosData } from '@/lib/data/training-videos';
import { serverApi } from '@/lib/server-api-client';
import type { Invitation, Member, User } from '@db';
import { db } from '@db/server';
import { getEmployeeSyncConnections } from '../data/queries';
import { TeamMembersClient } from './TeamMembersClient';
import type { BackgroundCheckStatus } from '../../[employeeId]/components/backgroundCheckTypes';

export type { BackgroundCheckStatus };

export interface MemberWithUser extends Member {
  user: User;
  backgroundCheckRequests?: BackgroundCheckSummary[];
}

export interface BackgroundCheckSummary {
  id: string;
  status: BackgroundCheckStatus;
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

export type DeviceStatus = 'compliant' | 'non-compliant' | 'not-installed';

export interface TeamMembersProps {
  canManageMembers: boolean;
  canInviteUsers: boolean;
  isCurrentUserOwner: boolean;
  organizationId: string;
}

export async function TeamMembers(props: TeamMembersProps) {
  const {
    canManageMembers,
    canInviteUsers,
    isCurrentUserOwner,
    organizationId,
  } = props;

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
  const complianceMemberIds = employeeMembers.map((m) => m.id);

  const orgFlags = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      securityTrainingStepEnabled: true,
      backgroundCheckStepEnabled: true,
    },
  });
  const backgroundCheckStepEnabled = orgFlags?.backgroundCheckStepEnabled === true;

  if (employeeMembers.length > 0) {
    const hipaaInstance = await db.frameworkInstance.findFirst({
      where: { organizationId, framework: { name: 'HIPAA' } },
      select: { id: true },
    });
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
    const trainingCompletions = orgFlags?.securityTrainingStepEnabled
      ? await db.employeeTrainingVideoCompletion.findMany({
          where: { memberId: { in: employeeIds } },
        })
      : [];

    const totalPolicies = policies.length;
    const totalTrainingVideos = orgFlags?.securityTrainingStepEnabled ? trainingVideosData.length : 0;
    const totalHipaaTraining = hasHipaaFramework ? 1 : 0;
    const totalTasks = totalPolicies + totalTrainingVideos + totalHipaaTraining;

    for (const employee of employeeMembers) {
      const policiesCompleted = policies.filter((p) => p.signedBy.includes(employee.id)).length;

      const trainingsCompleted = orgFlags?.securityTrainingStepEnabled
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
      isCurrentUserOwner={isCurrentUserOwner}
      employeeSyncData={employeeSyncData}
      taskCompletionMap={taskCompletionMap}
      complianceMemberIds={complianceMemberIds}
      backgroundCheckStepEnabled={backgroundCheckStepEnabled}
    />
  );
}
