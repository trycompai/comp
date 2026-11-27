import { db } from '@db';
import { completeAdmittedTask } from '../tasks/automatic-completion/complete-task-automatically';
import { awsScanEvidence } from './aws-scan-evidence';

import {
  canAutoCompleteTask,
  completionSelect,
  taskCompletionSnapshot,
} from '../tasks/automatic-completion/task-completion-policy';

export { canAutoCompleteTask, taskCompletionSnapshot };
export type { CompletionCandidate } from '../tasks/automatic-completion/task-completion-policy';

export async function autoSatisfyAwsTasks({
  organizationId,
  connectionId,
  runId,
}: {
  organizationId: string;
  connectionId: string;
  runId: string;
}): Promise<{ count: number; passingServices: string[] }> {
  const reference = { connectionId, runId };
  const scan = await awsScanEvidence({ organizationId, reference });
  if (!scan) return { count: 0, passingServices: [] };
  const { eligibleTemplateIds, passingServices } = scan;
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
  for (const task of candidates) {
    const result = await completeAdmittedTask({
      task,
      organizationId,
      source: 'aws',
      awsScan: reference,
    });
    count += result.count;
  }
  return { count, passingServices };
}
