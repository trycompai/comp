import { task } from '@trigger.dev/sdk';

// Retain these IDs as rejecting tasks so previously minted public tokens do
// not reach organization data after this worker version is deployed.
const rejectPublicTask = (): Promise<never> =>
  Promise.reject(
    new Error(
      'Public questionnaire tasks are retired. Use the authenticated questionnaire API.',
    ),
  );

export const answerQuestionTask = task({
  id: 'answer-question',
  retry: { maxAttempts: 1 },
  run: rejectPublicTask,
});

export const vendorQuestionnaireOrchestratorTask = task({
  id: 'vendor-questionnaire-orchestrator',
  retry: { maxAttempts: 1 },
  run: rejectPublicTask,
});
