import { StatusType } from '@/components/status-indicator';
import type { Control } from '@db';
import type { Task } from '@db';

export type SelectedPolicy = {
  status: string | null;
};

export interface DocumentType {
  formType: string;
}

export interface EvidenceSubmissionInfo {
  id: string;
  formType: string;
  createdAt: Date | string;
}

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

export function getControlStatus(
  policies: SelectedPolicy[],
  tasks: (Task & { controls: Control[] })[],
  controlId: string,
  documentTypes?: DocumentType[],
  evidenceSubmissions?: EvidenceSubmissionInfo[],
): StatusType {
  const controlTasks = tasks.filter((task) => task.controls.some((c) => c.id === controlId));

  const allPoliciesDraft =
    !policies.length || policies.every((policy) => policy.status === 'draft');
  const allTasksTodo =
    !controlTasks.length || controlTasks.every((task) => task.status === 'todo');

  const allPoliciesPublished =
    policies.length > 0 && policies.every((policy) => policy.status === 'published');
  const allTasksDone =
    controlTasks.length > 0 &&
    controlTasks.every((task) => task.status === 'done' || task.status === 'not_relevant');

  let allDocumentsFresh = true;
  let hasDocumentRequirements = false;
  let anyDocumentSubmitted = false;

  if (documentTypes?.length && evidenceSubmissions) {
    hasDocumentRequirements = true;
    const now = Date.now();

    const sorted = [...evidenceSubmissions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    for (const dt of documentTypes) {
      const latestSubmission = sorted.find((es) => es.formType === dt.formType);
      if (!latestSubmission) {
        allDocumentsFresh = false;
        continue;
      }
      anyDocumentSubmitted = true;
      if (now - new Date(latestSubmission.createdAt).getTime() > SIX_MONTHS_MS) {
        allDocumentsFresh = false;
      }
    }
  }

  const policiesComplete = policies.length === 0 || allPoliciesPublished;
  const tasksComplete = controlTasks.length === 0 || allTasksDone;
  const documentsComplete = !hasDocumentRequirements || allDocumentsFresh;

  if (policiesComplete && tasksComplete && documentsComplete) {
    const hasAnyArtifact = policies.length > 0 || controlTasks.length > 0 || hasDocumentRequirements;
    if (hasAnyArtifact) return 'completed';
  }

  if (allPoliciesDraft && allTasksTodo && !anyDocumentSubmitted) return 'not_started';
  return 'in_progress';
}

export function isPolicyCompleted(policy: SelectedPolicy): boolean {
  if (!policy) return false;
  return policy.status === 'published';
}

export function isControlCompliant(policies: SelectedPolicy[]): boolean {
  if (!policies || policies.length === 0) return false;
  return policies.every(isPolicyCompleted);
}

export function calculateControlStatus(
  policies: SelectedPolicy[],
): 'not_started' | 'in_progress' | 'completed' {
  if (!policies || policies.length === 0) return 'not_started';
  const completedPolicies = policies.filter(isPolicyCompleted).length;
  if (completedPolicies === 0) return 'not_started';
  if (completedPolicies === policies.length) return 'completed';
  return 'in_progress';
}
