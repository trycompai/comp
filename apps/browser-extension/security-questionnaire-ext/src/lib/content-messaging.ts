import type { InsertAnswerRequest, ScanDebug } from './types';
import { isRecord } from './message-utils';

export type ContentRequest =
  | { type: 'comp:collect-questions' }
  | { type: 'comp:ensure-inline-buttons' }
  | { type: 'comp:scan-visible-questions' }
  | { type: 'comp:generate-visible-page' }
  | { type: 'comp:set-detection-enabled'; enabled: boolean }
  | { type: 'comp:insert-answers'; answers: InsertAnswerRequest[] }
  | { type: 'comp:focus-question'; fieldId: string };

export type ContentResponse =
  | { ok: true; count: number; debug?: ScanDebug }
  | { ok: true; started: true; count: number; debug?: ScanDebug }
  | { ok: true; insertedCount: number; failedIds: string[] }
  | { ok: false; error: string };

export function parseContentRequest(value: unknown): ContentRequest | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;
  if (value.type === 'comp:collect-questions') return { type: value.type };
  if (value.type === 'comp:ensure-inline-buttons') return { type: value.type };
  if (value.type === 'comp:scan-visible-questions') return { type: value.type };
  if (value.type === 'comp:generate-visible-page') return { type: value.type };
  if (
    value.type === 'comp:set-detection-enabled' &&
    typeof value.enabled === 'boolean'
  ) {
    return { type: value.type, enabled: value.enabled };
  }
  if (value.type === 'comp:insert-answers' && Array.isArray(value.answers)) {
    return {
      type: value.type,
      answers: value.answers.flatMap(parseInsertAnswer),
    };
  }
  if (
    value.type === 'comp:focus-question' &&
    typeof value.fieldId === 'string'
  ) {
    return { type: value.type, fieldId: value.fieldId };
  }
  return null;
}

function parseInsertAnswer(answer: unknown): InsertAnswerRequest[] {
  if (
    isRecord(answer) &&
    typeof answer.fieldId === 'string' &&
    typeof answer.answer === 'string'
  ) {
    return [{ fieldId: answer.fieldId, answer: answer.answer }];
  }
  return [];
}
