import { task } from '@trigger.dev/sdk';

// Keep this task ID deployed as a tombstone: existing public tokens may still
// grant it even after the token endpoint is disabled.
export const parseQuestionnaireTask = task({
  id: 'parse-questionnaire',
  retry: { maxAttempts: 1 },
  run: (): Promise<never> =>
    Promise.reject(
      new Error(
        'Public questionnaire tasks are retired. Use the authenticated questionnaire API.',
      ),
    ),
});
