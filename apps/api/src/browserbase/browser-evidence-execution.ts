import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { renderOverlay } from './screenshot-overlay';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import {
  bringEvidencePageToFront,
  resolveEvidencePage,
} from './browser-evidence-page';
import { evaluateIfNeeded } from './browser-evidence-evaluation';
import {
  type BrowserAutomationFailureCode,
  type BrowserAutomationFailureStage,
  type ClassifiedBrowserAutomationError,
  classifyBrowserAutomationError,
} from './browser-automation-errors';
import type { BrowserEvidenceSessionInput } from './browser-evidence-runner.service';
import type { BrowserCredentialVaultAdapter } from './credential-vault';
import { reloginWithStoredCredentials } from './browser-credential-login';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const STAGEHAND_CUA_MODEL = 'anthropic/claude-sonnet-4-6';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface BrowserEvidenceLog {
  timestamp: string;
  stage: string;
  message: string;
}

export interface BrowserEvidenceExecutionResult {
  success: boolean;
  screenshot?: string;
  finalUrl?: string;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
  error?: string;
  needsReauth?: boolean;
  failureCode?: BrowserAutomationFailureCode;
  failureStage?: BrowserAutomationFailureStage;
  blockedReason?: string;
  logs: BrowserEvidenceLog[];
}

export async function executeBrowserEvidence({
  input,
  sessions,
  logger,
  vault,
  onLog,
}: {
  input: BrowserEvidenceSessionInput;
  sessions: BrowserbaseSessionService;
  logger: Logger;
  vault: BrowserCredentialVaultAdapter;
  /** Called as each stage begins, so a live test run can stream its progress. */
  onLog?: (log: BrowserEvidenceLog) => void;
}): Promise<BrowserEvidenceExecutionResult> {
  const logs: BrowserEvidenceLog[] = [];
  const log = (stage: string, message: string) => {
    const entry: BrowserEvidenceLog = {
      timestamp: new Date().toISOString(),
      stage,
      message,
    };
    logs.push(entry);
    onLog?.(entry);
  };
  let stagehand: Stagehand | null = null;
  let currentStage: BrowserAutomationFailureStage = 'session';

  try {
    log('session', 'Initializing Stagehand session.');
    stagehand = await sessions.createStagehand(input.sessionId);
    // Stable non-null handle for use inside async closures below, where the
    // `let stagehand` binding would otherwise widen back to `Stagehand | null`.
    const activeStagehand = stagehand;
    const initialPage = await sessions.ensureActivePage(stagehand);
    let page = initialPage;

    currentStage = 'navigation';
    log('navigation', `Opening ${input.targetUrl}.`);
    await page.goto(input.targetUrl, {
      waitUntil: 'domcontentloaded',
      timeoutMs: 30000,
    });
    await delay(1000);

    currentStage = 'auth';
    const authCheck = await checkAuth(stagehand);

    if (!authCheck.isLoggedIn) {
      log(
        'auth',
        'Session expired; attempting sign-in with stored credentials.',
      );
      const relogin = await reloginWithStoredCredentials({
        stagehand: activeStagehand,
        sessions,
        vault,
        input,
        verifyLoggedIn: async () =>
          (await checkAuth(activeStagehand)).isLoggedIn,
        log: (message) => log('auth', message),
      });
      page = relogin.page ?? page;

      if (!relogin.isLoggedIn) {
        // Classify our own known outcome directly rather than relying on string
        // matching: auto sign-in couldn't establish a session, so the profile
        // needs a human to reconnect (e.g. SMS/email/push/SSO login).
        const classified: ClassifiedBrowserAutomationError = {
          code: 'needs_reauth',
          stage: 'auth',
          userFacing:
            relogin.reason ??
            'Authentication is no longer valid. Reconnect this browser profile.',
          needsReauth: true,
          blockedReason: 'Automated sign-in could not establish a session.',
        };
        log('auth', classified.userFacing);
        return toExecutionFailure({ classified, logs });
      }
      log('auth', 'Re-authenticated with stored credentials.');
    }

    currentStage = 'action';
    log('action', 'Running navigation instruction.');
    const instruction = `${input.instruction}. After completing all navigation steps, stop and wait.`;
    await stagehand
      .agent({
        cua: true,
        model: {
          modelName: STAGEHAND_CUA_MODEL,
          apiKey: process.env.ANTHROPIC_API_KEY,
        },
      })
      .execute({ instruction, maxSteps: 20 });

    await delay(2000);
    page = await resolveEvidencePage({
      stagehand,
      initialPage,
      targetUrl: input.targetUrl,
    });
    const finalUrl = page.url();

    currentStage = 'screenshot';
    log('screenshot', 'Capturing screenshot.');
    const rawScreenshot = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      fullPage: false,
    });

    const screenshot = await renderScreenshot({
      logger,
      logs,
      rawScreenshot,
      instruction: input.instruction,
      finalUrl,
    });
    currentStage = 'evaluation';
    await bringEvidencePageToFront(page);
    const evaluation = await evaluateIfNeeded({
      stagehand,
      criteria: input.evaluationCriteria,
      logs,
    });

    if (!evaluation.success) {
      return {
        success: false,
        screenshot,
        finalUrl,
        evaluationStatus: evaluation.evaluationStatus,
        evaluationReason: evaluation.evaluationReason,
        error: evaluation.error,
        failureCode: evaluation.failureCode,
        failureStage: evaluation.failureStage,
        logs,
      };
    }

    return {
      success: true,
      screenshot,
      finalUrl,
      evaluationStatus: evaluation.evaluationStatus,
      evaluationReason: evaluation.evaluationReason,
      logs,
    };
  } catch (err) {
    const classified = classifyBrowserAutomationError(err, currentStage);
    log(classified.stage, classified.userFacing);
    logger.error('Failed to execute browser evidence run', err);
    return toExecutionFailure({ classified, logs });
  } finally {
    if (stagehand) {
      await sessions.safeCloseStagehand(stagehand);
    }
  }
}

async function renderScreenshot({
  logger,
  logs,
  rawScreenshot,
  instruction,
  finalUrl,
}: {
  logger: Logger;
  logs: BrowserEvidenceLog[];
  rawScreenshot: Buffer;
  instruction: string;
  finalUrl: string;
}): Promise<string> {
  let finalBuffer: Buffer = rawScreenshot;
  try {
    finalBuffer = await renderOverlay({
      buffer: rawScreenshot,
      instruction,
      sourceUrl: finalUrl,
      capturedAt: new Date(),
    });
  } catch (overlayErr) {
    logger.warn('Screenshot overlay render failed; uploading raw image', {
      error:
        overlayErr instanceof Error ? overlayErr.message : String(overlayErr),
    });
    logs.push({
      timestamp: new Date().toISOString(),
      stage: 'screenshot',
      message: 'Overlay failed; captured raw screenshot.',
    });
  }
  return finalBuffer.toString('base64');
}

async function checkAuth(
  stagehand: Stagehand,
): Promise<{ isLoggedIn: boolean }> {
  const loginSchema = z.object({ isLoggedIn: z.boolean() });
  return stagehand.extract(
    'Check if the user is logged in to this website. Look for a user avatar, profile menu, account dropdown, or login/sign-in buttons. Return true if logged in, false if you see login buttons or a login form.',
    loginSchema,
  );
}

function toExecutionFailure({
  classified,
  logs,
}: {
  classified: ClassifiedBrowserAutomationError;
  logs: BrowserEvidenceLog[];
}): BrowserEvidenceExecutionResult {
  return {
    success: false,
    error: classified.userFacing,
    needsReauth: classified.needsReauth,
    failureCode: classified.code,
    failureStage: classified.stage,
    blockedReason: classified.blockedReason,
    logs,
  };
}
