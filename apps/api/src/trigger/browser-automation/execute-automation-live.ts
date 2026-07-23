import { metadata, task } from '@trigger.dev/sdk';
import { BrowserbaseService } from '../../browserbase/browserbase.service';

const browserbaseService = new BrowserbaseService();

/**
 * Runs a saved automation on an already-started live session (from start-live)
 * so the user can watch the AI work AND see its steps — the same live timeline
 * the Test/connect flow shows. Kept off the HTTP request path because the
 * browser + AI work can outlast request timeouts; the Run view subscribes to
 * this run for live steps (`runSteps`) and the final result.
 */
export const executeAutomationLive = task({
  id: 'execute-automation-live',
  // Matches the scheduled run + test caps: a multi-step task on a complex site
  // can take a while; give it a safe budget instead of being cut off mid-run.
  maxDuration: 60 * 10,
  // A browser + AI run isn't safe to blindly retry (the session may be gone).
  retry: { maxAttempts: 1 },
  run: async (payload: {
    automationId: string;
    runId: string;
    sessionId: string;
    organizationId: string;
  }) => {
    // Runs EVERY step (all vendors), not just the first — step 0 on the live
    // session, later vendors in their own sessions.
    return browserbaseService.executeAutomationLive(
      payload.automationId,
      payload.runId,
      payload.sessionId,
      payload.organizationId,
      // Live activity timeline — surfaced to the Run view via realtime metadata.
      // Steps are plain JSON; cast to the SDK's value type (named interfaces lack
      // the index signature DeserializedJson structurally requires).
      (steps) =>
        metadata.set(
          'runSteps',
          steps as unknown as Parameters<typeof metadata.set>[1],
        ),
    );
  },
});
