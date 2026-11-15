import type { Prisma } from '@db';

export const completionSelect = {
  id: true,
  status: true,
  automationStatus: true,
  archivedAt: true,
  updatedAt: true,
  approverId: true,
  taskTemplateId: true,
  frequency: true,
  organization: { select: { evidenceApprovalEnabled: true } },
  evidenceAutomations: {
    where: { isEnabled: true },
    select: {
      id: true,
      evaluationCriteria: true,
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { id: true, version: true, updatedAt: true, scriptKey: true },
      },
      runs: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 1,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          startedAt: true,
          completedAt: true,
          status: true,
          success: true,
          evaluationStatus: true,
          evaluationCriteriaSnapshot: true,
          version: true,
        },
      },
    },
  },
} satisfies Prisma.TaskSelect;

export type CompletionCandidate = Prisma.TaskGetPayload<{
  select: typeof completionSelect;
}>;

export function canAutoCompleteTask(task: CompletionCandidate): boolean {
  if (
    task.automationStatus !== 'AUTOMATED' ||
    task.archivedAt !== null ||
    !['todo', 'in_progress', 'failed'].includes(task.status)
  ) {
    return false;
  }
  if (task.organization.evidenceApprovalEnabled && task.approverId !== null) {
    return false;
  }
  return task.evidenceAutomations.every((automation) => {
    const run = automation.runs[0];
    const version = automation.versions[0];
    return (
      automation.evaluationCriteria !== null &&
      automation.evaluationCriteria.trim().length > 0 &&
      run !== undefined &&
      version !== undefined &&
      run.status === 'completed' &&
      run.startedAt !== null &&
      run.completedAt !== null &&
      run.success === true &&
      run.evaluationStatus === 'pass' &&
      run.evaluationCriteriaSnapshot === automation.evaluationCriteria &&
      run.version === version.version &&
      run.startedAt >= version.updatedAt &&
      run.completedAt >= run.startedAt
    );
  });
}

export function taskCompletionSnapshot({
  task,
  organizationId,
}: {
  task: CompletionCandidate;
  organizationId: string;
}): Prisma.TaskWhereInput {
  // Recheck the evidence and review snapshot in the write itself. A newer run,
  // newly enabled collector, changed publication or manual decision must win.
  const evidenceSnapshot: Prisma.TaskWhereInput[] =
    task.evidenceAutomations.map((automation) => {
      const run = automation.runs[0];
      const version = automation.versions[0];
      if (!run || !version) {
        throw new Error('Cannot complete a task without evaluated evidence');
      }
      return {
        evidenceAutomations: {
          some: {
            id: automation.id,
            isEnabled: true,
            evaluationCriteria: automation.evaluationCriteria,
            versions: {
              some: version,
              none: { version: { gt: version.version } },
            },
            runs: {
              some: {
                ...run,
                status: 'completed',
                success: true,
                evaluationStatus: 'pass',
              },
              none: {
                OR: [
                  { createdAt: { gt: run.createdAt } },
                  { createdAt: run.createdAt, id: { gt: run.id } },
                ],
              },
            },
          },
        },
      };
    });
  return {
    id: task.id,
    organizationId,
    status: task.status,
    automationStatus: 'AUTOMATED',
    archivedAt: null,
    updatedAt: task.updatedAt,
    approverId: task.approverId,
    organization: {
      evidenceApprovalEnabled: task.organization.evidenceApprovalEnabled,
    },
    AND: [
      {
        evidenceAutomations: {
          none: {
            isEnabled: true,
            id: { notIn: task.evidenceAutomations.map((item) => item.id) },
          },
        },
      },
      ...evidenceSnapshot,
    ],
  };
}
