import type { DetectedQuestion } from '../types';
import { sendRuntimeMessage } from './safe-runtime';
import { detectVisibleSheetQuestions } from './sheets-dom';
import { detectSheetQuestions } from './sheets-detection';

export async function detectSheetQuestionsForPage(params: {
  location: Location;
  root: ParentNode;
}): Promise<DetectedQuestion[]> {
  const response = await sendRuntimeMessage({
    type: 'comp:detect-sheet-questions',
    pathname: params.location.pathname,
    hash: params.location.hash,
  });
  if (isSheetQuestionsResponse(response) && response.questions.length > 0) {
    return response.questions;
  }

  const pageQuestions = await detectSheetQuestions({
    location: params.location,
  }).catch(() => []);
  if (pageQuestions.length > 0) return pageQuestions;

  const visibleQuestions = detectVisibleSheetQuestions({
    root: params.root,
    location: params.location,
  });
  if (visibleQuestions.length > 0) return visibleQuestions;

  return isSheetQuestionsResponse(response) ? response.questions : [];
}

function isSheetQuestionsResponse(
  value: unknown,
): value is { ok: true; questions: DetectedQuestion[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    value.ok === true &&
    'questions' in value &&
    Array.isArray(value.questions)
  );
}
