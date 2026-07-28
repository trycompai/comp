import type { QuestionQueueItem } from './types';

/**
 * Google Docs has no reliable programmatic insertion path, so the side panel
 * hands the reviewed answers back to the user as clipboard text instead.
 */
export function buildAnswersClipboardText(items: QuestionQueueItem[]): string {
  return items
    .flatMap((item) => {
      const answer = item.answer?.trim();
      if (!answer) return [];
      return [`${item.question.trim()}\n${answer}`];
    })
    .join('\n\n');
}
