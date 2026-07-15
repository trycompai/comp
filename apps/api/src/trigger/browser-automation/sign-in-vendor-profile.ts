import { task } from '@trigger.dev/sdk';
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
  run: async (payload: {
    organizationId: string;
    profileId: string;
    url: string;
  }): Promise<AutoSignInResult> => {
    return signin.signInWithStoredCredentials(payload);
  },
});
