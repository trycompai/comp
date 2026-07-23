import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { failedBrowserEvidenceRunResult } from './browser-automation-run-result';
import { BrowserAutomationRunStoreService } from './browser-automation-run-store.service';
import { stepsForRun } from './browser-automation-step-results';
import { BrowserAutomationStepRunnerService } from './browser-automation-step-runner.service';
import {
  createEvidenceTimeline,
  type EvidenceTimelineStep,
} from './browser-evidence-step-timeline';
import {
  BrowserEvidenceRunnerService,
  type BrowserEvidenceRunResult,
} from './browser-evidence-runner.service';
import { BrowserbaseSessionService } from './browserbase-session.service';

@Injectable()
export class BrowserAutomationExecutionService {
  private readonly logger = new Logger(BrowserAutomationExecutionService.name);
  private readonly stepRunner: BrowserAutomationStepRunnerService;

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly profiles: BrowserAuthProfileService = new BrowserAuthProfileService(
      sessions,
    ),
    private readonly runner: BrowserEvidenceRunnerService = new BrowserEvidenceRunnerService(
      sessions,
    ),
    private readonly runs: BrowserAutomationRunStoreService = new BrowserAutomationRunStoreService(),
  ) {
    // Built here (not injected) so it reuses these exact profile/runner/run
    // instances — including the spied ones in unit tests.
    this.stepRunner = new BrowserAutomationStepRunnerService(
      this.profiles,
      this.runner,
      this.runs,
    );
  }

  async startAutomationWithLiveView(
    automationId: string,
    organizationId: string,
  ) {
    const automation = await this.getRunnableAutomation({
      automationId,
      organizationId,
    });
    const profile = await this.profiles.resolveProfileForTarget({
      organizationId,
      targetUrl: automation.targetUrl,
    });
    const run = await this.runs.createRun({
      automationId,
      profileId: profile.id,
    });

    try {
      const { sessionId, liveViewUrl } =
        await this.sessions.createSessionWithContext(profile.contextId);
      return { runId: run.id, sessionId, liveViewUrl, profileId: profile.id };
    } catch (error) {
      const result = failedBrowserEvidenceRunResult(error);
      await this.runs.finishRun({
        runId: run.id,
        startedAt: run.startedAt,
        result,
      });
      await this.stepRunner.applyProfileResult({
        organizationId,
        profileId: profile.id,
        result,
      });
      throw error;
    }
  }

  async executeAutomationOnSession(
    automationId: string,
    runId: string,
    sessionId: string,
    organizationId: string,
    /** Live activity timeline, surfaced to the Run live view via realtime. */
    onSteps?: (steps: EvidenceTimelineStep[]) => void,
  ) {
    const automation = await this.getRunnableAutomation({
      automationId,
      organizationId,
    });
    const run = await this.runs.getActiveRun({
      runId,
      automationId,
    });

    const profile = await this.profiles.resolveProfileForTarget({
      organizationId,
      targetUrl: automation.targetUrl,
      profileId: run.profileId ?? undefined,
    });
    const timeline = createEvidenceTimeline(onSteps);
    let result: BrowserEvidenceRunResult;
    try {
      result = await this.runner.executeEvidenceOnSession({
        organizationId,
        taskId: automation.taskId,
        automationId,
        runId,
        sessionId,
        targetUrl: automation.targetUrl,
        instruction: automation.instruction,
        evaluationCriteria: automation.evaluationCriteria,
        profile: {
          id: profile.id,
          hostname: profile.hostname,
          contextId: profile.contextId,
          vaultProvider: profile.vaultProvider,
          vaultExternalItemRef: profile.vaultExternalItemRef,
          vaultConnectionId: profile.vaultConnectionId,
        },
        onLog: (entry) => timeline.step(entry.message),
        beforeExecution: () =>
          this.runs.assertRunIsStillActive({ runId, automationId }),
      });
    } catch (error) {
      if (this.isTerminalReplayError(error)) throw error;
      this.logger.error('Browser evidence runner failed', error);
      result = failedBrowserEvidenceRunResult(error);
    }

    timeline.finish(
      result.success
        ? 'done'
        : result.status === 'blocked' || result.needsReauth
          ? 'warn'
          : 'fail',
    );

    await this.runs.finishRun({ runId, startedAt: run.startedAt, result });
    await this.stepRunner.applyProfileResult({
      organizationId,
      profileId: profile.id,
      result,
    });
    return this.toRunResponse({ runId, result });
  }

  async runBrowserAutomation(automationId: string, organizationId: string) {
    const automation = await this.getRunnableAutomation({
      automationId,
      organizationId,
    });
    const steps = stepsForRun(automation);

    // Attribute the run to the first step's connection.
    const firstProfile = await this.stepRunner.resolveStepProfile({
      organizationId,
      step: steps[0],
    });
    const run = await this.runs.createRun({
      automationId,
      profileId: firstProfile?.id,
    });

    const result = await this.stepRunner.runSteps({
      organizationId,
      taskId: automation.taskId,
      automationId,
      runId: run.id,
      steps,
      firstProfile,
    });

    await this.runs.finishRun({ runId: run.id, startedAt: run.startedAt, result });
    return this.toRunResponse({ runId: run.id, result });
  }

  private toRunResponse(input: {
    runId: string;
    result: BrowserEvidenceRunResult;
  }) {
    return {
      runId: input.runId,
      success: input.result.success,
      screenshotUrl: input.result.screenshotUrl,
      evaluationStatus: input.result.evaluationStatus,
      evaluationReason: input.result.evaluationReason,
      error: input.result.error,
      needsReauth: input.result.needsReauth,
      failureCode: input.result.failureCode,
      failureStage: input.result.failureStage,
      blockedReason: input.result.blockedReason,
    };
  }

  private async getRunnableAutomation(input: {
    automationId: string;
    organizationId: string;
  }) {
    const automation = await db.browserAutomation.findUnique({
      where: { id: input.automationId },
      include: {
        task: {
          select: { title: true, description: true, organizationId: true },
        },
        steps: { orderBy: { order: 'asc' } },
      },
    });
    if (
      !automation ||
      automation.task.organizationId !== input.organizationId
    ) {
      throw new NotFoundException('Automation not found');
    }
    return automation;
  }

  private isTerminalReplayError(error: unknown): boolean {
    return (
      error instanceof ConflictException || error instanceof NotFoundException
    );
  }
}
