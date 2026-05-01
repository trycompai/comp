import {
  evidenceFormDefinitionList,
  meetingSubTypeValues,
  toDbEvidenceFormType,
  toExternalEvidenceFormType,
} from '@trycompai/company';
import { db } from '@db';
import { ISO27001_FRAMEWORK_NAMES } from '../soa/utils/constants';
import { computePeopleScore } from './frameworks-people-score.helper';

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export { computeFrameworkComplianceScore } from './frameworks-compliance-score.helper';

export async function getOverviewScores(organizationId: string) {
  const [allPolicies, allTasks, employees, onboarding, org, hipaaInstance] =
    await Promise.all([
      db.policy.findMany({
        where: { organizationId, isArchived: false, archivedAt: null },
      }),
      db.task.findMany({ where: { organizationId, archivedAt: null } }),
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
          backgroundCheckStepEnabled: true,
        },
      }),
      db.frameworkInstance.findFirst({
        where: { organizationId, framework: { name: 'HIPAA' } },
        select: { id: true },
      }),
    ]);

  const securityTrainingStepEnabled = org?.securityTrainingStepEnabled === true;
  const deviceAgentStepEnabled = org?.deviceAgentStepEnabled === true;
  const backgroundCheckStepEnabled = org?.backgroundCheckStepEnabled === true;
  const hasHipaaFramework = !!hipaaInstance;

  const publishedPolicies = allPolicies.filter((p) => p.status === 'published');
  const draftPolicies = allPolicies.filter((p) => p.status === 'draft');
  const policiesInReview = allPolicies.filter(
    (p) => p.status === 'needs_review',
  );
  const unpublishedPolicies = allPolicies.filter(
    (p) => p.status === 'draft' || p.status === 'needs_review',
  );

  const doneTasks = allTasks.filter(
    (t) => t.status === 'done' || t.status === 'not_relevant',
  );
  const incompleteTasks = allTasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  );

  const people = await computePeopleScore({
    organizationId,
    allPolicies,
    employees,
    securityTrainingStepEnabled,
    deviceAgentStepEnabled,
    backgroundCheckStepEnabled,
    hasHipaaFramework,
  });

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
    people,
    onboardingTriggerJobId: onboarding?.triggerJobId ?? null,
    documents: await computeDocumentsScore(organizationId),
    findings: await getOrganizationFindings(organizationId),
  };
}

async function computeDocumentsScore(organizationId: string) {
  const [groupedStatuses, isoFrameworkInstances] = await Promise.all([
    db.evidenceSubmission.groupBy({
      by: ['formType'],
      where: { organizationId },
      _max: { submittedAt: true },
    }),
    db.frameworkInstance.findMany({
      where: {
        organizationId,
        framework: {
          name: {
            in: ISO27001_FRAMEWORK_NAMES,
          },
        },
      },
      select: { frameworkId: true },
    }),
  ]);

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
  const nonSOAOutstandingDocuments = includedForms.reduce((count, form) => {
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

  const isoFrameworkIds = isoFrameworkInstances
    .map((instance) => instance.frameworkId)
    .filter((id): id is string => !!id);
  const hasSOADocumentRequirement = isoFrameworkIds.length > 0;

  let soaCompleted = false;
  if (hasSOADocumentRequirement) {
    const latestSOADocument = await db.sOADocument.findFirst({
      where: {
        organizationId,
        isLatest: true,
        frameworkId: { in: isoFrameworkIds },
      },
      select: {
        approvedAt: true,
        status: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    soaCompleted =
      latestSOADocument?.status === 'completed' &&
      !!latestSOADocument.approvedAt;
  }

  const soaTotalDocuments = hasSOADocumentRequirement ? 1 : 0;
  const soaOutstandingDocuments =
    hasSOADocumentRequirement && !soaCompleted ? 1 : 0;
  const totalDocuments = includedForms.length + soaTotalDocuments;
  const outstandingDocuments =
    nonSOAOutstandingDocuments + soaOutstandingDocuments;

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
