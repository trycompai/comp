import type { DetectedQuestion, QuestionnaireSurface } from './types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseDetectedQuestion(value: unknown): DetectedQuestion[] {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.question !== 'string' ||
    typeof value.value !== 'string' ||
    typeof value.isEmpty !== 'boolean' ||
    typeof value.tag !== 'string'
  ) {
    return [];
  }
  return [
    {
      id: value.id,
      question: value.question,
      value: value.value,
      isEmpty: value.isEmpty,
      tag: value.tag,
    },
  ];
}

export function isQuestionnaireSurface(
  value: unknown,
): value is QuestionnaireSurface {
  return (
    value === 'generic' ||
    value === 'docs' ||
    value === 'sheets' ||
    value === 'forms'
  );
}
