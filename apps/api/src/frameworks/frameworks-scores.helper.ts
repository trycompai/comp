import {
  evidenceFormDefinitionList,
  meetingSubTypeValues,
  toDbEvidenceFormType,
  toExternalEvidenceFormType,
} from '@trycompai/company';
import { db } from '@db';
import { filterComplianceMembers } from '../utils/compliance-filters';

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const TRAINING_VIDEO_IDS = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];

export async function getOverviewScores(organizationId: string) {
  const [allPolicies, allTasks, employees, onboarding, org] = await Promise.all([
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
      select: { securityTrainingStepEnabled: true },
    }),
  ]);

  const securityTrainingStepEnabled = org?.securityTrainingStepEnabled === true;

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
  const activeEmployees = await filterComplianceMembers(employees, organizationId);

  let completedMembers = 0;

  if (activeEmployees.length > 0) {
    const requiredPolicies = allPolicies.filter(
      (p) =>
        p.isRequiredToSign && p.status === 'published' && !p.isArchived,
    );

    const trainingCompletions = securityTrainingStepEnabled
      ? await db.employeeTrainingVideoCompletion.findMany({
          where: { memberId: { in: activeEmployees.map((e) => e.id) } },
        })
      : [];

    for (const emp of activeEmployees) {
      const hasAcceptedAllPolicies =
        requiredPolicies.length === 0 ||
        requiredPolicies.every((p) => p.signedBy.includes(emp.id));

      const hasCompletedAllTraining = securityTrainingStepEnabled
        ? (() => {
            const empCompletions = trainingCompletions.filter(
              (c) => c.memberId === emp.id,
            );
            const completedVideoIds = empCompletions
              .filter((c) => c.completedAt !== null)
              .map((c) => c.videoId);
            return TRAINING_VIDEO_IDS.every((vid) =>
              completedVideoIds.includes(vid),
            );
          })()
        : true;

      if (hasAcceptedAllPolicies && hasCompletedAllTraining) {
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

  const includedForms = evidenceFormDefinitionList.filter((f) => !f.hidden && !f.optional);
  const totalDocuments = includedForms.length;
  const outstandingDocuments = includedForms.reduce((count, form) => {
    if (form.type === 'meeting') {
      const allMeetingsOutstanding = meetingSubTypeValues.every((subType) => {
        const lastSubmitted = statuses[subType]?.lastSubmittedAt;
        return !lastSubmitted || Date.now() - new Date(lastSubmitted).getTime() > SIX_MONTHS_MS;
      });
      return allMeetingsOutstanding ? count + 1 : count;
    }
    const lastSubmitted = statuses[form.type]?.lastSubmittedAt;
    const isOutstanding = !lastSubmitted || Date.now() - new Date(lastSubmitted).getTime() > SIX_MONTHS_MS;
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

export async function getCurrentMember(
  organizationId: string,
  userId: string,
) {
  const member = await db.member.findFirst({
    where: { userId, organizationId, deactivated: false },
    select: { id: true, role: true },
  });
  return member;
}

interface FrameworkWithControlsForScoring {
  controls: {
    id: string;
    policies: { id: string; status: string }[];
  }[];
}

interface TaskWithControls {
  id: string;
  status: string;
  controls: { id: string }[];
}

export function computeFrameworkComplianceScore(
  framework: FrameworkWithControlsForScoring,
  tasks: TaskWithControls[],
): number {
  const controls = framework.controls ?? [];

  // Deduplicate policies by id across all controls
  const uniquePoliciesMap = new Map<string, { id: string; status: string }>();
  for (const c of controls) {
    for (const p of c.policies || []) {
      uniquePoliciesMap.set(p.id, p);
    }
  }
  const uniquePolicies = Array.from(uniquePoliciesMap.values());

  const totalPolicies = uniquePolicies.length;
  const publishedPolicies = uniquePolicies.filter(
    (p) => p.status === 'published',
  ).length;
  const policyRatio = totalPolicies > 0 ? publishedPolicies / totalPolicies : 0;

  const controlIds = controls.map((c) => c.id);
  const uniqueTaskMap = new Map<string, TaskWithControls>();
  for (const t of tasks) {
    if (t.controls.some((c) => controlIds.includes(c.id))) {
      uniqueTaskMap.set(t.id, t);
    }
  }
  const uniqueTasks = Array.from(uniqueTaskMap.values());
  const totalTasks = uniqueTasks.length;
  const doneTasks = uniqueTasks.filter(
    (t) => t.status === 'done' || t.status === 'not_relevant',
  ).length;
  const taskRatio = totalTasks > 0 ? doneTasks / totalTasks : 1;

  return Math.round(((policyRatio + taskRatio) / 2) * 100);
}
