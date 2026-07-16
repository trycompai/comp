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

// Screenshot-based navigation model. Configurable via env so we can A/B
// computer-use models without a code change (and without tuning per site).
// Defaults to the newest Claude our Stagehand supports; set BROWSERBASE_CUA_MODEL
// to an `openai/…` model (e.g. openai/computer-use-preview) to route to OpenAI.
const DEFAULT_CUA_MODEL = 'anthropic/claude-sonnet-5';
// How many screenshot→action steps the agent may take. Generous so it can
// recover from a wrong turn on a complex site rather than giving up.
const CUA_MAX_STEPS = 30;

function resolveCuaModel(): { modelName: string; apiKey?: string } {
  const modelName = process.env.BROWSERBASE_CUA_MODEL || DEFAULT_CUA_MODEL;
  const apiKey = modelName.startsWith('openai/')
    ? process.env.OPENAI_API_KEY
    : process.env.ANTHROPIC_API_KEY;
  return { modelName, apiKey };
}

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
        'Not signed in on this page — signing in with stored credentials.',
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
    // Find its own way (no exact directions needed), self-correct a wrong turn,
    // and read what's already on screen instead of over-navigating.
    const instruction = `${input.instruction}. Work out the path yourself — you don't need exact directions. Before finishing, check the page actually matches what was asked; if you opened the wrong item or page, go back and correct it. If the information is already visible, capture it there without navigating further. When you're confident it's right, stop and wait.`;
    await stagehand
      .agent({
        cua: true,
        model: resolveCuaModel(),
      })
      .execute({ instruction, maxSteps: CUA_MAX_STEPS });

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
  // Detect the sign-in state by the presence of a login prompt rather than by
  // an avatar/profile menu: many apps have no obvious "logged-in" marker, so
  // requiring one produced false negatives (and needless re-logins). Treat the
  // page as logged in unless a sign-in prompt is clearly the ask.
  return stagehand.extract(
    'Is this page asking the user to sign in? Look for a visible login prompt: a password field, username/email + password fields, an SSO/"Continue with" screen, or a page whose main call to action is Sign in / Log in. Return isLoggedIn=false ONLY if such a sign-in prompt is clearly present. For any ordinary application or content page with no sign-in prompt, return isLoggedIn=true.',
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
