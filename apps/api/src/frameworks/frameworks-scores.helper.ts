import {
  evidenceFormDefinitionList,
  meetingSubTypeValues,
  toDbEvidenceFormType,
  toExternalEvidenceFormType,
} from '@trycompai/company';
import { db } from '@db';
import { filterComplianceMembers } from '../utils/compliance-filters';

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const GENERAL_TRAINING_IDS = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];
const HIPAA_TRAINING_ID = 'hipaa-sat-1';

export async function getOverviewScores(organizationId: string) {
  const [allPolicies, allTasks, employees, onboarding, org, hipaaInstance] =
    await Promise.all([
      db.policy.findMany({ where: { organizationId } }),
      db.task.findMany({ where: { organizationId } }),
      db.member.findMany({
        where: { organizationId, deactivated: false },
        include: { user: true },
      }),
      db.onboarding.findUnique({
        where: { organizationId },
        select: { triggerJobId: true },
      }),
      db.organization.findUnique({
        where: { id: organizationId },
        select: {
          securityTrainingStepEnabled: true,
          deviceAgentStepEnabled: true,
        },
      }),
      db.frameworkInstance.findFirst({
        where: { organizationId, framework: { name: 'HIPAA' } },
        select: { id: true },
      }),
    ]);

  const securityTrainingStepEnabled = org?.securityTrainingStepEnabled === true;
  const deviceAgentStepEnabled = org?.deviceAgentStepEnabled === true;
  const hasHipaaFramework = !!hipaaInstance;

  // Policy breakdown
  const publishedPolicies = allPolicies.filter((p) => p.status === 'published');
  const draftPolicies = allPolicies.filter((p) => p.status === 'draft');
  const policiesInReview = allPolicies.filter(
    (p) => p.status === 'needs_review',
  );
  const unpublishedPolicies = allPolicies.filter(
    (p) => p.status === 'draft' || p.status === 'needs_review',
  );

  // Task breakdown
  const doneTasks = allTasks.filter(
    (t) => t.status === 'done' || t.status === 'not_relevant',
  );
  const incompleteTasks = allTasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  );

  // People score — filter to members with compliance:required permission
  const activeEmployees = await filterComplianceMembers(
    employees,
    organizationId,
  );

  let completedMembers = 0;

  if (activeEmployees.length > 0) {
    const requiredPolicies = allPolicies.filter(
      (p) => p.isRequiredToSign && p.status === 'published' && !p.isArchived,
    );

    const memberIds = activeEmployees.map((e) => e.id);
    const memberUserIds = activeEmployees
      .map((e) => e.userId)
      .filter((id): id is string => !!id);
    const needsCompletions = securityTrainingStepEnabled || hasHipaaFramework;
    let membersWithInstalledDevices = new Set<string>();

    if (deviceAgentStepEnabled) {
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

      membersWithInstalledDevices = new Set([
        ...installedDevices.map((device) => device.memberId),
        ...memberIdsWithFleetData,
      ]);
    }

    const trainingCompletions = needsCompletions
      ? await db.employeeTrainingVideoCompletion.findMany({
          where: { memberId: { in: memberIds } },
        })
      : [];

    for (const emp of activeEmployees) {
      const hasAcceptedAllPolicies =
        requiredPolicies.length === 0 ||
        requiredPolicies.every((p) => p.signedBy.includes(emp.id));

      const completedVideoIds = trainingCompletions
        .filter((c) => c.memberId === emp.id && c.completedAt !== null)
        .map((c) => c.videoId);

      const hasCompletedAllTraining = securityTrainingStepEnabled
        ? GENERAL_TRAINING_IDS.every((vid) => completedVideoIds.includes(vid))
        : true;

      const hasCompletedHipaa = hasHipaaFramework
        ? completedVideoIds.includes(HIPAA_TRAINING_ID)
        : true;
      const hasInstalledDevice = deviceAgentStepEnabled
        ? membersWithInstalledDevices.has(emp.id)
        : true;

      if (
        hasAcceptedAllPolicies &&
        hasCompletedAllTraining &&
        hasCompletedHipaa &&
        hasInstalledDevice
      ) {
        completedMembers++;
      }
    }
  }

  return {
    policies: {
      total: allPolicies.length,
      published: publishedPolicies.length,
      draftPolicies,
      policiesInReview,
      unpublishedPolicies,
    },
    tasks: {
      total: allTasks.length,
      done: doneTasks.length,
      incompleteTasks,
    },
    people: {
      total: activeEmployees.length,
      completed: completedMembers,
    },
    onboardingTriggerJobId: onboarding?.triggerJobId ?? null,
    documents: await computeDocumentsScore(organizationId),
    findings: await getOrganizationFindings(organizationId),
  };
}

async function computeDocumentsScore(organizationId: string) {
  const groupedStatuses = await db.evidenceSubmission.groupBy({
    by: ['formType'],
    where: { organizationId },
    _max: { submittedAt: true },
  });

  const statuses: Record<string, { lastSubmittedAt: string | null }> = {};
  for (const form of evidenceFormDefinitionList) {
    const match = groupedStatuses.find(
      (entry) => entry.formType === toDbEvidenceFormType(form.type),
    );
    statuses[form.type] = {
      lastSubmittedAt: match?._max.submittedAt?.toISOString() ?? null,
    };
  }

  const includedForms = evidenceFormDefinitionList.filter(
    (f) => !f.hidden && !f.optional,
  );
  const totalDocuments = includedForms.length;
  const outstandingDocuments = includedForms.reduce((count, form) => {
    if (form.type === 'meeting') {
      const allMeetingsOutstanding = meetingSubTypeValues.every((subType) => {
        const lastSubmitted = statuses[subType]?.lastSubmittedAt;
        return (
          !lastSubmitted ||
          Date.now() - new Date(lastSubmitted).getTime() > SIX_MONTHS_MS
        );
      });
      return allMeetingsOutstanding ? count + 1 : count;
    }
    const lastSubmitted = statuses[form.type]?.lastSubmittedAt;
    const isOutstanding =
      !lastSubmitted ||
      Date.now() - new Date(lastSubmitted).getTime() > SIX_MONTHS_MS;
    return isOutstanding ? count + 1 : count;
  }, 0);

  return {
    totalDocuments,
    completedDocuments: totalDocuments - outstandingDocuments,
    outstandingDocuments,
  };
}

async function getOrganizationFindings(organizationId: string) {
  const findings = await db.finding.findMany({
    where: { organizationId },
    include: {
      task: { select: { id: true, title: true } },
      evidenceSubmission: { select: { id: true, formType: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return findings.map((finding) => ({
    ...finding,
    evidenceFormType: toExternalEvidenceFormType(finding.evidenceFormType),
    evidenceSubmission: finding.evidenceSubmission
      ? {
          ...finding.evidenceSubmission,
          formType:
            toExternalEvidenceFormType(finding.evidenceSubmission.formType) ??
            'meeting',
        }
      : null,
  }));
}

export async function getCurrentMember(organizationId: string, userId: string) {
  const member = await db.member.findFirst({
    where: { userId, organizationId, deactivated: false },
    select: { id: true, role: true },
  });
  return member;
}

interface ControlForScoring {
  id: string;
  policies: { id: string; status: string }[];
  controlDocumentTypes?: { formType: string }[];
}

interface FrameworkWithControlsForScoring {
  controls: ControlForScoring[];
}

interface TaskWithControls {
  id: string;
  status: string;
  controls: { id: string }[];
}

interface EvidenceSubmissionForScoring {
  formType: string;
  submittedAt: Date | string;
}

function hasAnyArtifact(
  control: ControlForScoring,
  tasks: TaskWithControls[],
): boolean {
  const policies = control.policies ?? [];
  const documentTypes = control.controlDocumentTypes ?? [];
  const controlTasks = tasks.filter((t) =>
    t.controls.some((c) => c.id === control.id),
  );
  return (
    policies.length > 0 || controlTasks.length > 0 || documentTypes.length > 0
  );
}

function isControlCompleted(
  control: ControlForScoring,
  tasks: TaskWithControls[],
  evidenceSubmissions: EvidenceSubmissionForScoring[],
): boolean {
  const policies = control.policies ?? [];
  const documentTypes = control.controlDocumentTypes ?? [];
  const controlTasks = tasks.filter((t) =>
    t.controls.some((c) => c.id === control.id),
  );

  const policiesComplete =
    policies.length === 0 ||
    policies.every((p) => p.status === 'published');

  const tasksComplete =
    controlTasks.length === 0 ||
    controlTasks.every(
      (t) => t.status === 'done' || t.status === 'not_relevant',
    );

  let documentsComplete = true;
  if (documentTypes.length > 0) {
    const sorted = [...evidenceSubmissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    const now = Date.now();
    for (const dt of documentTypes) {
      const latest = sorted.find((es) => es.formType === dt.formType);
      if (
        !latest ||
        now - new Date(latest.submittedAt).getTime() > SIX_MONTHS_MS
      ) {
        documentsComplete = false;
        break;
      }
    }
  }

  return policiesComplete && tasksComplete && documentsComplete;
}

export function computeFrameworkComplianceScore(
  framework: FrameworkWithControlsForScoring,
  tasks: TaskWithControls[],
  evidenceSubmissions: EvidenceSubmissionForScoring[] = [],
): number {
  const controls = (framework.controls ?? []).filter((c) =>
    hasAnyArtifact(c, tasks),
  );
  if (controls.length === 0) return 0;
  const completed = controls.filter((c) =>
    isControlCompleted(c, tasks, evidenceSubmissions),
  ).length;
  return Math.round((completed / controls.length) * 100);
}
