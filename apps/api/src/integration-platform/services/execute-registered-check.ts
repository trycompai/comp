import { NotFoundException } from '@nestjs/common';
import type { CheckRunRepository } from '../repositories/check-run.repository';
import type { RunAllChecksResult } from './connection-check-runner.service';

/** Register the real attempt before execution so old green cannot hide it. */
export async function executeRegisteredCheck({
  repository,
  connectionId,
  taskId,
  checkId,
  failureStatus,
  execute,
}: {
  repository: CheckRunRepository;
  connectionId: string;
  taskId?: string | null;
  checkId: string;
  failureStatus: 'failed' | 'inconclusive';
  execute: () => Promise<RunAllChecksResult>;
}) {
  const checkRun = await repository.create({
    connectionId,
    taskId: taskId ?? undefined,
    checkId,
    checkName: checkId,
    startedAt: new Date(),
  });
  try {
    const result = await execute();
    const checkResult = result.results[0];
    if (!checkResult || checkResult.checkId !== checkId) {
      throw new NotFoundException(
        `Check ${checkId} produced no matching result for connection ${connectionId}`,
      );
    }
    return { checkRun, checkResult };
  } catch (error) {
    try {
      await repository.complete(checkRun.id, {
        status: failureStatus,
        durationMs: 0,
        totalChecked: 0,
        passedCount: 0,
        failedCount: 0,
        completionEvidenceBinding: null,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (persistenceError) {
      throw new AggregateError(
        [error, persistenceError],
        'Check execution and attempt recording failed',
      );
    }
    throw error;
  }
}
