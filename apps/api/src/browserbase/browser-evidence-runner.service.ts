import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@db';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';
import {
  BROWSER_CREDENTIAL_VAULT_ADAPTER,
  type BrowserCredentialVaultAdapter,
} from './credential-vault';
import { resolveBrowserCredentialVaultAdapter } from './browser-credential-vault.factory';
import {
  type BrowserAutomationFailureCode,
  type BrowserAutomationFailureStage,
} from './browser-automation-errors';
import {
  executeBrowserEvidence,
  type BrowserEvidenceLog,
  type BrowserEvidenceExecutionResult,
} from './browser-evidence-execution';
import { browserRunCoordinator } from './browser-run-coordinator';

export interface BrowserEvidenceRunnerInput {
  organizationId: string;
  taskId?: string;
  automationId: string;
  runId: string;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string | null;
  profile: {
    id: string;
    hostname: string;
    contextId: string;
    vaultProvider?: string | null;
    vaultExternalItemRef?: string | null;
    vaultConnectionId?: string | null;
  };
  beforeExecution?: () => Promise<void>;
  /** Live per-stage progress callback (used to stream a test run's activity). */
  onLog?: (log: BrowserEvidenceLog) => void;
}

export interface BrowserEvidenceSessionInput extends BrowserEvidenceRunnerInput {
  sessionId: string;
}

export interface BrowserEvidenceRunResult {
  success: boolean;
  status: 'completed' | 'failed' | 'blocked';
  screenshotKey?: string;
  screenshotUrl?: string;
  /** A focused close-up (the agent's final viewport) shown beside the full page. */
  focusScreenshotKey?: string;
  focusScreenshotUrl?: string;
  finalUrl?: string;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
  error?: string;
  needsReauth?: boolean;
  failureCode?: BrowserAutomationFailureCode;
  failureStage?: BrowserAutomationFailureStage;
  blockedReason?: string;
  logs: Prisma.InputJsonValue;
}

const toJsonLogs = (logs: BrowserEvidenceLog[]): Prisma.InputJsonArray =>
  logs.map(
    (log): Prisma.InputJsonObject => ({
      timestamp: log.timestamp,
      stage: log.stage,
      message: log.message,
    }),
  );

@Injectable()
export class BrowserEvidenceRunnerService {
  private readonly logger = new Logger(BrowserEvidenceRunnerService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly screenshots: BrowserbaseScreenshotService = new BrowserbaseScreenshotService(),
    @Inject(BROWSER_CREDENTIAL_VAULT_ADAPTER)
    private readonly vault: BrowserCredentialVaultAdapter = resolveBrowserCredentialVaultAdapter(),
  ) {}

  async runEvidence(
    input: BrowserEvidenceRunnerInput,
  ): Promise<BrowserEvidenceRunResult> {
    return browserRunCoordinator.withProfileLock({
      profileId: input.profile.id,
      hostname: input.profile.hostname,
      run: async () => {
        const { sessionId } = await this.sessions.createSessionWithContext(
          input.profile.contextId,
        );

        try {
          return await this.executeEvidenceOnSessionUnlocked({
            ...input,
            sessionId,
          });
        } finally {
          await this.closeSession(sessionId);
        }
      },
    });
  }

  async executeEvidenceOnSession(
    input: BrowserEvidenceSessionInput,
  ): Promise<BrowserEvidenceRunResult> {
    return browserRunCoordinator.withProfileLock({
      profileId: input.profile.id,
      hostname: input.profile.hostname,
      run: () => this.executeEvidenceOnSessionUnlocked(input),
    });
  }

  private async executeEvidenceOnSessionUnlocked(
    input: BrowserEvidenceSessionInput,
  ): Promise<BrowserEvidenceRunResult> {
    await input.beforeExecution?.();

    const execution = await executeBrowserEvidence({
      input,
      sessions: this.sessions,
      logger: this.logger,
      vault: this.vault,
      onLog: input.onLog,
    });
    let uploaded: {
      screenshotKey?: string;
      screenshotUrl?: string;
      focusScreenshotKey?: string;
      focusScreenshotUrl?: string;
    } | null = null;
    try {
      uploaded = await this.uploadCapturedScreenshot({ input, execution });
    } catch (err) {
      this.logger.warn(
        'Screenshot upload failed; continuing without screenshot',
        {
          runId: input.runId,
          error: err instanceof Error ? err.message : String(err),
        },
      );
      execution.logs.push({
        timestamp: new Date().toISOString(),
        stage: 'upload',
        message: 'Screenshot upload failed; run completed without screenshot.',
      });
    }

    if (!execution.success) {
      return {
        success: false,
        status: this.blockedStatusForCode(execution.failureCode),
        screenshotKey: uploaded?.screenshotKey,
        screenshotUrl: uploaded?.screenshotUrl,
        focusScreenshotKey: uploaded?.focusScreenshotKey,
        focusScreenshotUrl: uploaded?.focusScreenshotUrl,
        finalUrl: execution.finalUrl,
        evaluationStatus: execution.evaluationStatus,
        evaluationReason: execution.evaluationReason,
        error: execution.error,
        needsReauth: execution.needsReauth,
        failureCode: execution.failureCode,
        failureStage: execution.failureStage,
        blockedReason: execution.blockedReason,
        logs: toJsonLogs(execution.logs),
      };
    }

    return {
      success: true,
      status: 'completed',
      screenshotKey: uploaded?.screenshotKey,
      screenshotUrl: uploaded?.screenshotUrl,
      focusScreenshotKey: uploaded?.focusScreenshotKey,
      focusScreenshotUrl: uploaded?.focusScreenshotUrl,
      finalUrl: execution.finalUrl,
      evaluationStatus: execution.evaluationStatus,
      evaluationReason: execution.evaluationReason,
      logs: toJsonLogs(execution.logs),
    };
  }

  private async uploadOne(
    input: BrowserEvidenceRunnerInput,
    base64: string,
    variant?: string,
  ): Promise<{ key: string; url: string }> {
    // A variant keys to a distinct object (…/runId-focus.jpg) so it doesn't
    // overwrite the full-page shot.
    const key = await this.screenshots.uploadScreenshot({
      organizationId: input.organizationId,
      automationId: input.automationId,
      runId: variant ? `${input.runId}-${variant}` : input.runId,
      base64Screenshot: base64,
    });
    const url = await this.screenshots.getPresignedUrl({ key });
    return { key, url };
  }

  private async uploadCapturedScreenshot({
    input,
    execution,
  }: {
    input: BrowserEvidenceRunnerInput;
    execution: BrowserEvidenceExecutionResult;
  }): Promise<{
    screenshotKey?: string;
    screenshotUrl?: string;
    focusScreenshotKey?: string;
    focusScreenshotUrl?: string;
  } | null> {
    if (!execution.screenshot) return null;

    const [full, focus] = await Promise.all([
      this.uploadOne(input, execution.screenshot),
      execution.focusScreenshot
        ? this.uploadOne(input, execution.focusScreenshot, 'focus')
        : Promise.resolve(null),
    ]);

    return {
      screenshotKey: full.key,
      screenshotUrl: full.url,
      focusScreenshotKey: focus?.key,
      focusScreenshotUrl: focus?.url,
    };
  }

  private async closeSession(sessionId: string): Promise<void> {
    try {
      await this.sessions.closeSession(sessionId);
    } catch (err) {
      this.logger.warn('Failed to close Browserbase session (ignored)', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private blockedStatusForCode(
    code: BrowserAutomationFailureCode | undefined,
  ): 'failed' | 'blocked' {
    if (code === 'captcha_blocked' || code === 'needs_user_action') {
      return 'blocked';
    }
    return 'failed';
  }
}
