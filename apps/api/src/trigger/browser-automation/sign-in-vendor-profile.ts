import { metadata, task } from '@trigger.dev/sdk';
import {
  BrowserCredentialSigninService,
  type AutoSignInResult,
} from '../../browserbase/browser-credential-signin.service';

const signin = new BrowserCredentialSigninService();

/**
 * Runs the connect flow's first automated sign-in in the background: opens a
 * cloud browser, fills the credentials the user just stored, and verifies the
 * session. Kept off the HTTP request path because the browser + AI work can
 * outlast request/browser timeouts. The connect flow subscribes to the run and,
 * if it can't complete unattended, hands the live browser to the user.
 */
export const signInVendorProfile = task({
  id: 'sign-in-vendor-profile',
  maxDuration: 240,
  // A browser + AI sign-in isn't safe to blindly retry (it would re-enter
  // credentials on a session that may already be gone), so run it once.
  retry: { maxAttempts: 1 },
  run: async (payload: {
    organizationId: string;
    profileId: string;
    url: string;
    sessionId: string;
    mode?: 'password' | 'sso';
    /** Vendor's identifier-field label (e.g. "IAM username") for a truthful step. */
    usernameLabel?: string;
  }): Promise<AutoSignInResult> => {
    return signin.signInWithStoredCredentials({
      ...payload,
      // Live activity timeline — surfaced to the connect flow via realtime metadata.
      // Steps are plain JSON; cast to the SDK's value type (named interfaces lack
      // the index signature DeserializedJson structurally requires).
      onSteps: (steps) =>
        metadata.set(
          'signinSteps',
          steps as unknown as Parameters<typeof metadata.set>[1],
        ),
      // The tab the AI is on — so the connect flow's iframe follows it across
      // new tabs (e.g. AWS opening its sign-in in a new tab).
      onLiveView: (liveViewUrl) => metadata.set('signinLiveViewUrl', liveViewUrl),
    });
  },
});
