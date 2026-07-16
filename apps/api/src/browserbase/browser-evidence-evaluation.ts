import { z } from 'zod';
import {
  type BrowserAutomationFailureCode,
  type BrowserAutomationFailureStage,
  evaluationFailedError,
} from './browser-automation-errors';
import type { BrowserEvidenceLog } from './browser-evidence-execution';

export interface BrowserEvidenceEvaluator {
  extract<T extends z.ZodType>(
    instruction: string,
    schema: T,
  ): Promise<z.infer<T>>;
}

export async function evaluateIfNeeded({
  stagehand,
  criteria,
  instruction,
  logs,
}: {
  stagehand: BrowserEvidenceEvaluator;
  criteria?: string | null;
  /** What the automation was capturing — anchors the check to the intended target. */
  instruction?: string | null;
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
    const target = instruction?.trim();
    const evaluation = await stagehand.extract(
      [
        'You are an auditor reviewing the current page after an automation has finished navigating.',
        target
          ? `The automation was asked to: "${target}". Judge the criteria about THAT specific target — ignore unrelated items that merely happen to appear on the page (e.g. a matching value belonging to a different item does not count).`
          : '',
        'Decide whether the page clearly satisfies this criteria for the intended target.',
        'Only return pass=true if the evidence is unambiguously present and visible for that target.',
        'If it is ambiguous, missing, applies only to a different item, or is contradicted, return pass=false.',
        'Always provide a short reason (max 220 characters).',
        '',
        `Criteria: ${normalizedCriteria}`,
      ]
        .filter(Boolean)
        .join('\n'),
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
      evaluationStatus: 'fail',
      evaluationReason: classified.userFacing,
      error: classified.userFacing,
      failureCode: classified.code,
      failureStage: classified.stage,
    };
  }
}
