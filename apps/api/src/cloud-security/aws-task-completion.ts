import { db, type Prisma } from '@db';
import { AWS_SERVICE_TASK_MAPPINGS } from './aws-task-mappings';
import type { SecurityFinding } from './cloud-security.service';

const completionSelect = {
  id: true,
  status: true,
  automationStatus: true,
  archivedAt: true,
  updatedAt: true,
  approverId: true,
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

function getPassingTemplates(findings: SecurityFinding[]) {
  const findingsByService = new Map<string, SecurityFinding[]>();
  for (const finding of findings) {
    const serviceId = finding.evidence?.serviceId;
    if (typeof serviceId !== 'string' || !serviceId) continue;
    const group = findingsByService.get(serviceId) ?? [];
    group.push(finding);
    findingsByService.set(serviceId, group);
  }

  const passingServices = [...findingsByService.entries()]
    .filter(([, serviceFindings]) =>
      serviceFindings.every((finding) => finding.passed === true),
    )
    .map(([serviceId]) => serviceId);
  const templateIds = new Set(
    passingServices.flatMap(
      (serviceId) => AWS_SERVICE_TASK_MAPPINGS[serviceId] ?? [],
    ),
  );
  const eligibleTemplateIds = [...templateIds].filter((templateId) => {
    const scannedServices = Object.entries(AWS_SERVICE_TASK_MAPPINGS)
      .filter(([, templates]) => templates.includes(templateId))
      .map(([serviceId]) => serviceId)
      .filter((serviceId) => findingsByService.has(serviceId));
    return (
      scannedServices.length > 0 &&
      scannedServices.every((serviceId) => passingServices.includes(serviceId))
    );
  });
  return { eligibleTemplateIds, passingServices };
}

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

export async function autoSatisfyAwsTasks({
  organizationId,
  findings,
}: {
  organizationId: string;
  findings: SecurityFinding[];
}): Promise<{ count: number; passingServices: string[] }> {
  const { eligibleTemplateIds, passingServices } =
    getPassingTemplates(findings);
  if (eligibleTemplateIds.length === 0) return { count: 0, passingServices };

  const candidates = await db.task.findMany({
    where: {
      organizationId,
      taskTemplateId: { in: eligibleTemplateIds },
      status: { in: ['todo', 'in_progress', 'failed'] },
      automationStatus: 'AUTOMATED',
      archivedAt: null,
    },
    select: completionSelect,
  });

  let count = 0;
  const now = new Date();
  for (const task of candidates) {
    if (!canAutoCompleteTask(task)) continue;
    const result = await db.task.updateMany({
      where: taskCompletionSnapshot({ task, organizationId }),
      data: { status: 'done', lastCompletedAt: now },
    });
    count += result.count;
  }
  return { count, passingServices };
}
