import { BackgroundCheckStatus, db } from '@db';
import { filterComplianceMembers } from '../utils/compliance-filters';

const GENERAL_TRAINING_IDS = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];
const HIPAA_TRAINING_ID = 'hipaa-sat-1';
const COMPLETED_BACKGROUND_CHECK_STATUSES = [
  BackgroundCheckStatus.completed,
  BackgroundCheckStatus.completed_with_flags,
];

interface ScorePolicy {
  isRequiredToSign: boolean;
  status: string;
  isArchived: boolean;
  signedBy: string[];
}

interface ScoreMember {
  id: string;
  userId?: string | null;
  role: string;
  user?: { role?: string | null } | null;
}

interface ComputePeopleScoreParams {
  organizationId: string;
  allPolicies: ScorePolicy[];
  employees: ScoreMember[];
  securityTrainingStepEnabled: boolean;
  deviceAgentStepEnabled: boolean;
  backgroundCheckStepEnabled: boolean;
  hasHipaaFramework: boolean;
}

export async function computePeopleScore({
  organizationId,
  allPolicies,
  employees,
  securityTrainingStepEnabled,
  deviceAgentStepEnabled,
  backgroundCheckStepEnabled,
  hasHipaaFramework,
}: ComputePeopleScoreParams) {
  const activeEmployees = await filterComplianceMembers(
    employees,
    organizationId,
  );
  if (activeEmployees.length === 0) {
    return { total: 0, completed: 0 };
  }

  const requiredPolicies = allPolicies.filter(
    (p) => p.isRequiredToSign && p.status === 'published' && !p.isArchived,
  );
  const memberIds = activeEmployees.map((employee) => employee.id);
  const memberUserIds = activeEmployees
    .map((employee) => employee.userId)
    .filter((id): id is string => !!id);

  const [
    membersWithInstalledDevices,
    trainingCompletions,
    membersWithCompletedBackgroundChecks,
    exemptMemberIds,
  ] = await Promise.all([
    getMembersWithInstalledDevices({
      organizationId,
      memberIds,
      memberUserIds,
      deviceAgentStepEnabled,
    }),
    getTrainingCompletions({
      memberIds,
      needsCompletions: securityTrainingStepEnabled || hasHipaaFramework,
    }),
    backgroundCheckStepEnabled
      ? getMembersWithCompletedBackgroundChecks({ organizationId, memberIds })
      : Promise.resolve(new Set<string>()),
    backgroundCheckStepEnabled
      ? getExemptMemberIds({ organizationId, memberIds })
      : Promise.resolve(new Set<string>()),
  ]);

  const completed = activeEmployees.filter((employee) => {
    const hasAcceptedAllPolicies =
      requiredPolicies.length === 0 ||
      requiredPolicies.every((policy) => policy.signedBy.includes(employee.id));

    const completedVideoIds = trainingCompletions
      .filter(
        (completion) =>
          completion.memberId === employee.id &&
          completion.completedAt !== null,
      )
      .map((completion) => completion.videoId);

    const hasCompletedAllTraining = securityTrainingStepEnabled
      ? GENERAL_TRAINING_IDS.every((videoId) =>
          completedVideoIds.includes(videoId),
        )
      : true;
    const hasCompletedHipaa = hasHipaaFramework
      ? completedVideoIds.includes(HIPAA_TRAINING_ID)
      : true;
    const hasInstalledDevice = deviceAgentStepEnabled
      ? membersWithInstalledDevices.has(employee.id)
      : true;
    const memberRequiresBgCheck =
      backgroundCheckStepEnabled && !exemptMemberIds.has(employee.id);
    const hasCompletedBackgroundCheck = memberRequiresBgCheck
      ? membersWithCompletedBackgroundChecks.has(employee.id)
      : true;

    return (
      hasAcceptedAllPolicies &&
      hasCompletedAllTraining &&
      hasCompletedHipaa &&
      hasInstalledDevice &&
      hasCompletedBackgroundCheck
    );
  }).length;

  return { total: activeEmployees.length, completed };
}

async function getMembersWithInstalledDevices({
  organizationId,
  memberIds,
  memberUserIds,
  deviceAgentStepEnabled,
}: {
  organizationId: string;
  memberIds: string[];
  memberUserIds: string[];
  deviceAgentStepEnabled: boolean;
}) {
  if (!deviceAgentStepEnabled) return new Set<string>();

  const [installedDevices, membersWithFleetLabels, fleetPolicyResults] =
    await Promise.all([
      db.device.findMany({
        where: {
          organizationId,
          memberId: { in: memberIds },
        },
        select: { memberId: true },
        distinct: ['memberId'],
      }),
      db.member.findMany({
        where: {
          organizationId,
          id: { in: memberIds },
          NOT: { fleetDmLabelId: null },
        },
        select: { id: true, userId: true },
      }),
      memberUserIds.length > 0
        ? db.fleetPolicyResult.findMany({
            where: {
              organizationId,
              userId: { in: memberUserIds },
            },
            select: { userId: true },
            distinct: ['userId'],
          })
        : Promise.resolve([]),
    ]);

  const fleetUserIdsWithData = new Set(
    fleetPolicyResults.map((result) => result.userId),
  );
  const memberIdsWithFleetData = membersWithFleetLabels
    .filter((member) => fleetUserIdsWithData.has(member.userId))
    .map((member) => member.id);

  return new Set([
    ...installedDevices.map((device) => device.memberId),
    ...memberIdsWithFleetData,
  ]);
}

async function getTrainingCompletions({
  memberIds,
  needsCompletions,
}: {
  memberIds: string[];
  needsCompletions: boolean;
}) {
  if (!needsCompletions) return [];
  return db.employeeTrainingVideoCompletion.findMany({
    where: { memberId: { in: memberIds } },
  });
}

async function getMembersWithCompletedBackgroundChecks({
  organizationId,
  memberIds,
}: {
  organizationId: string;
  memberIds: string[];
}) {
  const completedBackgroundChecks = await db.backgroundCheckRequest.findMany({
    where: {
      organizationId,
      memberId: { in: memberIds },
      status: { in: COMPLETED_BACKGROUND_CHECK_STATUSES },
    },
    select: { memberId: true },
    distinct: ['memberId'],
  });

  return new Set(completedBackgroundChecks.map((check) => check.memberId));
}

async function getExemptMemberIds({
  organizationId,
  memberIds,
}: {
  organizationId: string;
  memberIds: string[];
}) {
  const exemptMembers = await db.member.findMany({
    where: {
      organizationId,
      id: { in: memberIds },
      backgroundCheckExempt: true,
    },
    select: { id: true },
  });

  return new Set(exemptMembers.map((member) => member.id));
}
