import { db } from '@db/server';
import {
  evidenceFormDefinitionList,
  meetingSubTypeValues,
  toDbEvidenceFormType,
} from '@trycompai/company';

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

const MEETING_SUB_TYPES = meetingSubTypeValues;

export type DocumentFormStatuses = Record<
  string,
  { lastSubmittedAt: string | null; isNotRelevant?: boolean }
>;

type EvidenceAutomationRunLite = {
  status: string;
  success: boolean | null;
  evaluationStatus: string | null;
  createdAt?: Date;
};

type EvidenceAutomationLite = {
  isEnabled: boolean;
  runs?: EvidenceAutomationRunLite[];
};

export type TaskWithEvidenceLite = {
  status: string;
  evidenceAutomations?: EvidenceAutomationLite[];
};

export function isOutstandingDocument(lastSubmittedAt: string | null): boolean {
  if (!lastSubmittedAt) return true;
  const elapsed = Date.now() - new Date(lastSubmittedAt).getTime();
  return elapsed > SIX_MONTHS_MS;
}

function isMeetingOutstanding(statuses: DocumentFormStatuses): boolean {
  return MEETING_SUB_TYPES.every((subType) =>
    isOutstandingDocument(statuses[subType]?.lastSubmittedAt ?? null),
  );
}

export function computeDocumentsProgress(statuses: DocumentFormStatuses) {
  const includedForms = evidenceFormDefinitionList.filter((form) => !form.hidden && !form.optional);
  const relevantForms = includedForms.filter((form) => statuses[form.type]?.isNotRelevant !== true);
  const totalDocuments = relevantForms.length;
  const outstandingDocuments = relevantForms.reduce((count, form) => {
    if (form.type === 'meeting') {
      return isMeetingOutstanding(statuses) ? count + 1 : count;
    }
    const lastSubmittedAt = statuses[form.type]?.lastSubmittedAt ?? null;
    return isOutstandingDocument(lastSubmittedAt) ? count + 1 : count;
  }, 0);

  return {
    totalDocuments,
    completedDocuments: totalDocuments - outstandingDocuments,
    outstandingDocuments,
  };
}

export async function getDocumentFormStatusesForOrganization(
  organizationId: string,
): Promise<DocumentFormStatuses> {
  const [groupedStatuses, settings] = await Promise.all([
    db.evidenceSubmission.groupBy({
      by: ['formType'],
      where: { organizationId },
      _max: { submittedAt: true },
    }),
    db.evidenceFormSetting.findMany({
      where: { organizationId },
      select: { formType: true, isNotRelevant: true },
    }),
  ]);
  const notRelevantFormTypes = new Set(
    settings.filter((setting) => setting.isNotRelevant).map((setting) => setting.formType),
  );

  const statuses: DocumentFormStatuses = {};
  for (const form of evidenceFormDefinitionList) {
    const match = groupedStatuses.find(
      (entry) => entry.formType === toDbEvidenceFormType(form.type),
    );
    statuses[form.type] = {
      lastSubmittedAt: match?._max.submittedAt?.toISOString() ?? null,
      isNotRelevant: notRelevantFormTypes.has(toDbEvidenceFormType(form.type)),
    };
  }

  return statuses;
}

function isSuccessfulAutomationRun(run: EvidenceAutomationRunLite | undefined): boolean {
  if (!run) return false;
  return run.status === 'completed' && run.success === true && run.evaluationStatus !== 'fail';
}

export function isTaskEvidenceComplete(task: TaskWithEvidenceLite): boolean {
  const enabledAutomations = (task.evidenceAutomations ?? []).filter(
    (automation) => automation.isEnabled,
  );

  if (enabledAutomations.length === 0) return true;

  return enabledAutomations.every((automation) => isSuccessfulAutomationRun(automation.runs?.[0]));
}

export function isTaskStrictlyComplete(task: TaskWithEvidenceLite): boolean {
  const hasCompleteStatus = task.status === 'done' || task.status === 'not_relevant';
  if (!hasCompleteStatus) return false;
  return isTaskEvidenceComplete(task);
}

export function countStrictlyCompletedTasks<T extends TaskWithEvidenceLite>(tasks: T[]): number {
  return tasks.filter((task) => isTaskStrictlyComplete(task)).length;
}
