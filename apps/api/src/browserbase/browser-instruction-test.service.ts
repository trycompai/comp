import { Injectable, Logger } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import type { BrowserEvidenceLog } from './browser-evidence-execution';

/** A single line in the live test-run activity timeline (mirrors the sign-in flow). */
export interface InstructionTestStep {
  /** Step label. */
  l: string;
  /** Clock timestamp, e.g. "06:02:14". */
  t: string;
  state: 'done' | 'active' | 'pending' | 'warn' | 'fail';
}

export interface InstructionTestResult {
  success: boolean;
  screenshotUrl?: string;
  finalUrl?: string;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
  error?: string;
  needsReauth?: boolean;
  failureCode?: string;
  blockedReason?: string;
}

const clock = () =>
  new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

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
  }): Promise<InstructionTestResult> {
    const steps: InstructionTestStep[] = [];
    const emit = () => input.onSteps?.(steps.map((s) => ({ ...s })));
    // Each engine stage advances the timeline: the prior active step becomes
    // done and a new active step is appended.
    const step = (label: string) => {
      const last = steps[steps.length - 1];
      if (last?.state === 'active') last.state = 'done';
      steps.push({ l: label, t: clock(), state: 'active' });
      emit();
    };
    const finish = (state: InstructionTestStep['state']) => {
      const last = steps[steps.length - 1];
      if (last) last.state = state;
      emit();
    };

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
      onLog: (entry: BrowserEvidenceLog) => step(entry.message),
    });

    finish(
      result.success
        ? 'done'
        : result.status === 'blocked' || result.needsReauth
          ? 'warn'
          : 'fail',
    );

    return {
      success: result.success,
      screenshotUrl: result.screenshotUrl,
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
