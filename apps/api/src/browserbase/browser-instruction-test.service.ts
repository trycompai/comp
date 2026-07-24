import { Injectable, Logger } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import type { BrowserEvidenceLog } from './browser-evidence-execution';
import {
  createEvidenceTimeline,
  type EvidenceTimelineStep,
} from './browser-evidence-step-timeline';

/** A single line in the live test-run activity timeline (mirrors the sign-in flow). */
export type InstructionTestStep = EvidenceTimelineStep;

export interface InstructionTestResult {
  success: boolean;
  screenshotUrl?: string;
  /** A focused close-up (the agent's final viewport) shown beside the full page. */
  focusScreenshotUrl?: string;
  finalUrl?: string;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
  error?: string;
  needsReauth?: boolean;
  failureCode?: string;
  blockedReason?: string;
}

/**
 * Runs an instruction the user hasn't saved yet against the connection's live
 * session, so they can watch it work before committing it to the schedule.
 *
 * It reuses the exact evidence runner scheduled runs use, so a passing test
 * means the saved instruction will behave the same unattended. Nothing is
 * persisted — no automation, no run record — this only proves the instruction
 * out. The caller owns the session (it shows the live view); we never close it.
 */
@Injectable()
export class BrowserInstructionTestService {
  private readonly logger = new Logger(BrowserInstructionTestService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly profiles: BrowserAuthProfileService = new BrowserAuthProfileService(
      sessions,
    ),
    private readonly runner: BrowserEvidenceRunnerService = new BrowserEvidenceRunnerService(
      sessions,
    ),
  ) {}

  async testInstructionOnSession(input: {
    organizationId: string;
    taskId?: string;
    profileId?: string;
    targetUrl: string;
    instruction: string;
    evaluationCriteria?: string;
    sessionId: string;
    /** Live activity timeline, surfaced to the composer's test panel. */
    onSteps?: (steps: InstructionTestStep[]) => void;
    /** Active-tab live-view URL, so the test panel follows the agent across tabs. */
    onLiveView?: (url: string) => void;
  }): Promise<InstructionTestResult> {
    const timeline = createEvidenceTimeline(input.onSteps);

    const profile = await this.profiles.resolveProfileForTarget({
      organizationId: input.organizationId,
      targetUrl: input.targetUrl,
      profileId: input.profileId,
    });

    const result = await this.runner.executeEvidenceOnSession({
      organizationId: input.organizationId,
      taskId: input.taskId,
      // Synthetic ids: nothing is persisted, but the runner uses them for the
      // screenshot key path and its own logging.
      automationId: `test-${profile.id}`,
      runId: `test-${input.sessionId}`,
      sessionId: input.sessionId,
      targetUrl: input.targetUrl,
      instruction: input.instruction,
      evaluationCriteria: input.evaluationCriteria,
      profile: {
        id: profile.id,
        hostname: profile.hostname,
        contextId: profile.contextId,
        vaultProvider: profile.vaultProvider,
        vaultExternalItemRef: profile.vaultExternalItemRef,
        vaultConnectionId: profile.vaultConnectionId,
      },
      onLog: (entry: BrowserEvidenceLog) => timeline.step(entry.message),
      onLiveView: input.onLiveView,
    });

    timeline.finish(
      result.success
        ? 'done'
        : result.status === 'blocked' || result.needsReauth
          ? 'warn'
          : 'fail',
    );

    return {
      success: result.success,
      screenshotUrl: result.screenshotUrl,
      focusScreenshotUrl: result.focusScreenshotUrl,
      finalUrl: result.finalUrl,
      evaluationStatus: result.evaluationStatus,
      evaluationReason: result.evaluationReason,
      error: result.error,
      needsReauth: result.needsReauth,
      failureCode: result.failureCode,
      blockedReason: result.blockedReason,
    };
  }
}
