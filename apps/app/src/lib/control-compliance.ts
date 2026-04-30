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
  submittedAt: Date | string;
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
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );

    for (const dt of documentTypes) {
      const latestSubmission = sorted.find((es) => es.formType === dt.formType);
      if (!latestSubmission) {
        allDocumentsFresh = false;
        continue;
      }
      anyDocumentSubmitted = true;
      if (now - new Date(latestSubmission.submittedAt).getTime() > SIX_MONTHS_MS) {
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

export type RequirementStatusVariant = 'default' | 'secondary' | 'destructive';

export interface RequirementStatusBadge {
  label: string;
  variant: RequirementStatusVariant;
}

export function getRequirementStatus(
  controlStatuses: StatusType[],
): RequirementStatusBadge {
  if (controlStatuses.length === 0) {
    return { label: 'No Controls', variant: 'secondary' };
  }

  const allCompleted = controlStatuses.every((s) => s === 'completed');
  if (allCompleted) {
    return { label: 'Satisfied', variant: 'default' };
  }

  const allNotStarted = controlStatuses.every((s) => s === 'not_started');
  if (allNotStarted) {
    return { label: 'Not Started', variant: 'destructive' };
  }

  return { label: 'In Progress', variant: 'secondary' };
}

export function getControlProgressPercent(
  policies: SelectedPolicy[],
  tasks: (Task & { controls: Control[] })[],
  controlId: string,
  documentTypes?: DocumentType[],
  evidenceSubmissions?: EvidenceSubmissionInfo[],
): number {
  const controlTasks = tasks.filter((task) => task.controls.some((c) => c.id === controlId));

  let totalItems = policies.length + controlTasks.length;
  let completedItems = 0;

  for (const policy of policies) {
    if (policy.status === 'published') completedItems++;
  }
  for (const task of controlTasks) {
    if (task.status === 'done' || task.status === 'not_relevant') completedItems++;
  }

  if (documentTypes?.length) {
    totalItems += documentTypes.length;
    if (evidenceSubmissions?.length) {
      const now = Date.now();
      const sorted = [...evidenceSubmissions].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
      for (const dt of documentTypes) {
        const latest = sorted.find((es) => es.formType === dt.formType);
        if (
          latest &&
          now - new Date(latest.submittedAt).getTime() <= SIX_MONTHS_MS
        ) {
          completedItems++;
        }
      }
    }
  }

  return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

export function getRequirementCompliancePercent(
  controlProgressPercents: number[],
): number {
  if (controlProgressPercents.length === 0) return 0;
  const sum = controlProgressPercents.reduce((a, b) => a + b, 0);
  return Math.round(sum / controlProgressPercents.length);
}

export interface ControlForRequirementCounts {
  id: string;
  policies?: Array<{ id: string; status: string | null }> | null;
  controlDocumentTypes?: Array<{ formType: string }> | null;
}

export interface RequirementArtifactCounts {
  policies: { total: number; completed: number };
  tasks: { total: number; completed: number };
  documents: { total: number; completed: number };
}

export function getRequirementArtifactCounts(
  controls: ControlForRequirementCounts[],
  tasks: (Task & { controls: Control[] })[],
  evidenceSubmissions?: EvidenceSubmissionInfo[],
): RequirementArtifactCounts {
  const controlIds = new Set(controls.map((c) => c.id));

  const policiesById = new Map<string, { id: string; status: string | null }>();
  for (const control of controls) {
    for (const policy of control.policies ?? []) {
      policiesById.set(policy.id, policy);
    }
  }

  const tasksById = new Map<string, Task & { controls: Control[] }>();
  for (const task of tasks) {
    if (task.controls.some((c) => controlIds.has(c.id))) {
      tasksById.set(task.id, task);
    }
  }

  const documentFormTypes = new Set<string>();
  for (const control of controls) {
    for (const dt of control.controlDocumentTypes ?? []) {
      documentFormTypes.add(dt.formType);
    }
  }

  const policiesCompleted = Array.from(policiesById.values()).filter(
    (p) => p.status === 'published',
  ).length;
  const tasksCompleted = Array.from(tasksById.values()).filter(
    (t) => t.status === 'done' || t.status === 'not_relevant',
  ).length;

  let documentsCompleted = 0;
  if (documentFormTypes.size > 0 && evidenceSubmissions?.length) {
    const now = Date.now();
    const sorted = [...evidenceSubmissions].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    for (const formType of documentFormTypes) {
      const latest = sorted.find((es) => es.formType === formType);
      if (latest && now - new Date(latest.submittedAt).getTime() <= SIX_MONTHS_MS) {
        documentsCompleted++;
      }
    }
  }

  return {
    policies: { total: policiesById.size, completed: policiesCompleted },
    tasks: { total: tasksById.size, completed: tasksCompleted },
    documents: { total: documentFormTypes.size, completed: documentsCompleted },
  };
}

export function getFrameworkAggregatePercent(
  controls: ControlForRequirementCounts[],
  tasks: (Task & { controls: Control[] })[],
  evidenceSubmissions?: EvidenceSubmissionInfo[],
): number {
  const counts = getRequirementArtifactCounts(controls, tasks, evidenceSubmissions);
  const total =
    counts.policies.total + counts.tasks.total + counts.documents.total;
  if (total === 0) return 0;
  const completed =
    counts.policies.completed + counts.tasks.completed + counts.documents.completed;
  return Math.round((completed / total) * 100);
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
