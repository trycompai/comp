const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

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
  const controlTasks = tasks.filter((task) =>
    task.controls.some((controlRef) => controlRef.id === control.id),
  );
  return (
    policies.length > 0 || controlTasks.length > 0 || documentTypes.length > 0
  );
}

function isControlCompleted({
  control,
  tasks,
  evidenceSubmissions,
}: {
  control: ControlForScoring;
  tasks: TaskWithControls[];
  evidenceSubmissions: EvidenceSubmissionForScoring[];
}): boolean {
  const policies = control.policies ?? [];
  const documentTypes = control.controlDocumentTypes ?? [];
  const controlTasks = tasks.filter((task) =>
    task.controls.some((controlRef) => controlRef.id === control.id),
  );

  const policiesComplete =
    policies.length === 0 ||
    policies.every((policy) => policy.status === 'published');
  const tasksComplete =
    controlTasks.length === 0 ||
    controlTasks.every(
      (task) => task.status === 'done' || task.status === 'not_relevant',
    );

  let documentsComplete = true;
  if (documentTypes.length > 0) {
    const sorted = [...evidenceSubmissions].sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    const now = Date.now();
    for (const documentType of documentTypes) {
      const latest = sorted.find(
        (submission) => submission.formType === documentType.formType,
      );
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
  const controls = (framework.controls ?? []).filter((control) =>
    hasAnyArtifact(control, tasks),
  );
  if (controls.length === 0) return 0;

  const completed = controls.filter((control) =>
    isControlCompleted({ control, tasks, evidenceSubmissions }),
  ).length;

  return Math.round((completed / controls.length) * 100);
}
