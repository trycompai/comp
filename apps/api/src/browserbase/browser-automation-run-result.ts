import { type Prisma } from '@db';
import {
  type BrowserAutomationFailureCode,
  classifyBrowserAutomationError,
} from './browser-automation-errors';
import type { BrowserEvidenceRunResult } from './browser-evidence-runner.service';

export function statusForBrowserFailureCode(
  code: BrowserAutomationFailureCode | undefined,
): 'failed' | 'blocked' {
  if (code === 'captcha_blocked' || code === 'needs_user_action') {
    return 'blocked';
  }
  return 'failed';
}

export function failedBrowserEvidenceRunResult(
  error: unknown,
): BrowserEvidenceRunResult {
  const classified = classifyBrowserAutomationError(error);
  const logs: Prisma.InputJsonArray = [
    {
      timestamp: new Date().toISOString(),
      stage: classified.stage,
      message: classified.userFacing,
    },
  ];

  return {
    success: false,
    status: statusForBrowserFailureCode(classified.code),
    error: classified.userFacing,
    needsReauth: classified.needsReauth,
    failureCode: classified.code,
    failureStage: classified.stage,
    blockedReason: classified.blockedReason,
    logs,
  };
}
