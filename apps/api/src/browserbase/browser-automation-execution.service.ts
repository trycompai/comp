import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserAutomationRunStoreService } from './browser-automation-run-store.service';
import { failedBrowserEvidenceRunResult } from './browser-automation-run-result';
import {
  BrowserEvidenceRunnerService,
  type BrowserEvidenceRunResult,
} from './browser-evidence-runner.service';
import { BrowserbaseSessionService } from './browserbase-session.service';

@Injectable()
export class BrowserAutomationExecutionService {
  private readonly logger = new Logger(BrowserAutomationExecutionService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly profiles: BrowserAuthProfileService = new BrowserAuthProfileService(
      sessions,
    ),
    private readonly runner: BrowserEvidenceRunnerService = new BrowserEvidenceRunnerService(
      sessions,
    ),
    private readonly runs: BrowserAutomationRunStoreService = new BrowserAutomationRunStoreService(),
  ) {}

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
      await this.applyProfileResult({
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
        },
        beforeExecution: () =>
          this.runs.assertRunIsStillActive({ runId, automationId }),
      });
    } catch (error) {
      if (this.isTerminalReplayError(error)) throw error;
      this.logger.error('Browser evidence runner failed', error);
      result = failedBrowserEvidenceRunResult(error);
    }

    await this.runs.finishRun({ runId, startedAt: run.startedAt, result });
    await this.applyProfileResult({
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
    const profile = await this.profiles.resolveProfileForTarget({
      organizationId,
      targetUrl: automation.targetUrl,
    });
    const run = await this.runs.createRun({
      automationId,
      profileId: profile.id,
    });

    if (profile.status !== 'verified') {
      const result = this.profileBlockedResult(profile.status);
      await this.runs.finishRun({
        runId: run.id,
        startedAt: run.startedAt,
        result,
      });
      return this.toRunResponse({ runId: run.id, result });
    }

    let result: BrowserEvidenceRunResult;
    try {
      result = await this.runner.runEvidence({
        organizationId,
        taskId: automation.taskId,
        automationId,
        runId: run.id,
        targetUrl: automation.targetUrl,
        instruction: automation.instruction,
        evaluationCriteria: automation.evaluationCriteria,
        profile: {
          id: profile.id,
          hostname: profile.hostname,
          contextId: profile.contextId,
        },
      });
    } catch (error) {
      this.logger.error('Browser evidence runner failed', error);
      result = failedBrowserEvidenceRunResult(error);
    }
    await this.runs.finishRun({
      runId: run.id,
      startedAt: run.startedAt,
      result,
    });
    await this.applyProfileResult({
      organizationId,
      profileId: profile.id,
      result,
    });
    return this.toRunResponse({ runId: run.id, result });
  }

  private async applyProfileResult(input: {
    organizationId: string;
    profileId: string;
    result: BrowserEvidenceRunResult;
  }) {
    if (input.result.failureCode === 'needs_reauth') {
      await this.profiles.markNeedsReauth({
        organizationId: input.organizationId,
        profileId: input.profileId,
        reason: input.result.blockedReason,
      });
    }

    if (
      input.result.failureCode === 'captcha_blocked' ||
      input.result.failureCode === 'needs_user_action'
    ) {
      await this.profiles.markBlocked({
        organizationId: input.organizationId,
        profileId: input.profileId,
        reason:
          input.result.blockedReason ??
          input.result.error ??
          'User action is required before this automation can run.',
      });
    }
  }

  private profileBlockedResult(status: string): BrowserEvidenceRunResult {
    const needsUserAction = status === 'blocked';
    return {
      success: false,
      status: 'blocked',
      error: needsUserAction
        ? 'This browser profile is blocked. Resolve the blocked state before running automations.'
        : 'This browser profile is not verified. Reconnect it before running automations.',
      needsReauth: !needsUserAction,
      failureCode: needsUserAction ? 'needs_user_action' : 'needs_reauth',
      failureStage: 'auth',
      blockedReason: needsUserAction
        ? 'Browser profile is blocked.'
        : 'Browser profile is not verified.',
      logs: [],
    };
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
