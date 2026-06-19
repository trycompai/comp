import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { renderOverlay } from './screenshot-overlay';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import {
  bringEvidencePageToFront,
  resolveEvidencePage,
} from './browser-evidence-page';
import {
  type BrowserAutomationFailureCode,
  type BrowserAutomationFailureStage,
  type ClassifiedBrowserAutomationError,
  classifyBrowserAutomationError,
  evaluationFailedError,
} from './browser-automation-errors';
import type { BrowserEvidenceSessionInput } from './browser-evidence-runner.service';

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
}: {
  input: BrowserEvidenceSessionInput;
  sessions: BrowserbaseSessionService;
  logger: Logger;
}): Promise<BrowserEvidenceExecutionResult> {
  const logs: BrowserEvidenceLog[] = [];
  const log = (stage: string, message: string) => {
    logs.push({ timestamp: new Date().toISOString(), stage, message });
  };
  let stagehand: Stagehand | null = null;
  let currentStage: BrowserAutomationFailureStage = 'session';

  try {
    log('session', 'Initializing Stagehand session.');
    stagehand = await sessions.createStagehand(input.sessionId);
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
      const classified = classifyBrowserAutomationError(
        new Error('Session expired. User is not logged in.'),
        'auth',
      );
      log('auth', classified.userFacing);
      return toExecutionFailure({ classified, logs });
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

async function evaluateIfNeeded({
  stagehand,
  criteria,
  logs,
}: {
  stagehand: Stagehand;
  criteria?: string | null;
  logs: BrowserEvidenceLog[];
}): Promise<{
  success: boolean;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
  error?: string;
  failureCode?: BrowserAutomationFailureCode;
  failureStage?: BrowserAutomationFailureStage;
}> {
  const normalizedCriteria = criteria?.trim();
  if (!normalizedCriteria) return { success: true };

  logs.push({
    timestamp: new Date().toISOString(),
    stage: 'evaluation',
    message: 'Evaluating final page against criteria.',
  });

  try {
    const evalSchema = z.object({
      pass: z.boolean(),
      reason: z.string(),
    });
    const evaluation = await stagehand.extract(
      `You are an auditor reviewing the current page after an automation has finished navigating. Decide whether the page clearly satisfies this criteria. Only return pass=true if the evidence is unambiguously present and visible. If it is ambiguous, missing, or contradicted, return pass=false. Always provide a short reason (max 220 characters).\n\nCriteria: ${normalizedCriteria}`,
      evalSchema,
    );

    return {
      success: true,
      evaluationStatus: evaluation.pass ? 'pass' : 'fail',
      evaluationReason: evaluation.reason,
    };
  } catch (err) {
    const classified = evaluationFailedError(
      'The automation captured evidence, but evaluation failed. Review the screenshot manually.',
    );
    logs.push({
      timestamp: new Date().toISOString(),
      stage: classified.stage,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      error: classified.userFacing,
      failureCode: classified.code,
      failureStage: classified.stage,
    };
  }
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
