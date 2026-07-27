import { metadata, task } from '@trigger.dev/sdk';
import {
  BrowserInstructionTestService,
  type InstructionTestResult,
} from '../../browserbase/browser-instruction-test.service';

const tester = new BrowserInstructionTestService();

/**
 * Runs a not-yet-saved instruction against the connection's live session so the
 * user can watch it work before committing it to the schedule. Kept off the HTTP
 * request path because the browser + AI work can outlast request timeouts; the
 * composer subscribes to the run for live steps and the final result.
 */
export const testVendorInstruction = task({
  id: 'test-vendor-instruction',
  // Sign-in can take ~40s before navigation even starts, so give the run a
  // generous, safe budget to finish a multi-step task on a complex site instead
  // of being cut off mid-way. Matches the scheduled run's 10-minute cap.
  maxDuration: 60 * 10,
  // A browser + AI run isn't safe to blindly retry (the session may be gone),
  // so run it once.
  retry: { maxAttempts: 1 },
  run: async (payload: {
    organizationId: string;
    taskId?: string;
    profileId?: string;
    targetUrl: string;
    instruction: string;
    evaluationCriteria?: string;
    sessionId: string;
  }): Promise<InstructionTestResult> => {
    return tester.testInstructionOnSession({
      ...payload,
      // Live activity timeline — surfaced to the composer via realtime metadata.
      // Steps are plain JSON; cast to the SDK's value type (named interfaces lack
      // the index signature DeserializedJson structurally requires).
      onSteps: (steps) =>
        metadata.set(
          'testSteps',
          steps as unknown as Parameters<typeof metadata.set>[1],
        ),
      // Follow the agent across tabs so the composer's live view tracks the
      // page it's actually working on, not the stale starting tab.
      onLiveView: (liveViewUrl) => metadata.set('testLiveViewUrl', liveViewUrl),
    });
  },
});
