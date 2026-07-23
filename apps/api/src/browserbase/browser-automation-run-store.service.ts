import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, Prisma } from '@db';
import type { BrowserEvidenceRunResult } from './browser-evidence-runner.service';

@Injectable()
export class BrowserAutomationRunStoreService {
  private readonly maxCreateRunAttempts = 3;

  async createRun(input: { automationId: string; profileId?: string }) {
    for (let attempt = 0; attempt < this.maxCreateRunAttempts; attempt += 1) {
      try {
        return await db.$transaction(
          async (tx) => {
            const attemptCount =
              (await tx.browserAutomationRun.count({
                where: { automationId: input.automationId },
              })) + 1;
            return tx.browserAutomationRun.create({
              data: {
                automationId: input.automationId,
                profileId: input.profileId,
                status: 'running',
                startedAt: new Date(),
                attemptCount,
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          !this.isSerializationConflict(error) ||
          attempt === this.maxCreateRunAttempts - 1
        ) {
          throw error;
        }
      }
    }

    throw new Error('Failed to create browser automation run.');
  }

  async finishRun(input: {
    runId: string;
    startedAt: Date | null;
    result: BrowserEvidenceRunResult;
  }): Promise<void> {
    const updated = await db.browserAutomationRun.updateMany({
      where: { id: input.runId, status: 'running' },
      data: {
        status: input.result.status,
        completedAt: new Date(),
        durationMs: input.startedAt
          ? Date.now() - input.startedAt.getTime()
          : 0,
        screenshotUrl: input.result.screenshotKey,
        evaluationStatus: input.result.evaluationStatus ?? null,
        evaluationReason: input.result.evaluationReason ?? null,
        error: input.result.error,
        failureCode: input.result.failureCode,
        failureStage: input.result.failureStage,
        blockedReason: input.result.blockedReason,
        finalUrl: input.result.finalUrl,
        logs: input.result.logs,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException('Run is no longer active.');
    }
  }

  async createStepRun(input: {
    runId: string;
    stepId: string | null;
    order: number;
  }) {
    return db.browserAutomationStepRun.create({
      data: {
        runId: input.runId,
        stepId: input.stepId,
        order: input.order,
        status: 'running',
        startedAt: new Date(),
      },
    });
  }

  async finishStepRun(input: {
    stepRunId: string;
    result: BrowserEvidenceRunResult;
  }): Promise<void> {
    await db.browserAutomationStepRun.update({
      where: { id: input.stepRunId },
      data: {
        status: input.result.status,
        completedAt: new Date(),
        screenshotUrl: input.result.screenshotKey ?? null,
        evaluationStatus: input.result.evaluationStatus ?? null,
        evaluationReason: input.result.evaluationReason ?? null,
        error: input.result.error ?? null,
      },
    });
  }

  async getActiveRun(input: { runId: string; automationId: string }) {
    const run = await db.browserAutomationRun.findUnique({
      where: { id: input.runId },
    });
    if (!run || run.automationId !== input.automationId) {
      throw new NotFoundException('Run not found');
    }
    if (run.status !== 'running') {
      throw new ConflictException('Run is no longer active.');
    }
    return run;
  }

  async assertRunIsStillActive(input: {
    runId: string;
    automationId: string;
  }): Promise<void> {
    await this.getActiveRun(input);
  }

  private isSerializationConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }
}
