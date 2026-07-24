import { z } from 'zod';
import type {
  BrowserCredentialVaultAdapter,
  RuntimeCredentialMaterial,
} from './credential-vault';
import type { BrowserbaseSessionService } from './browserbase-session.service';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;
type ActivePage = Awaited<
  ReturnType<BrowserbaseSessionService['ensureActivePage']>
>;

/**
 * The minimum a credential sign-in needs: which profile's stored login to
 * resolve, and where to land afterward. Both the scheduler (evidence runs) and
 * the connect flow's first sign-in satisfy this shape, so neither is coupled to
 * the other's input type.
 */
export interface CredentialLoginTarget {
  profile: {
    id: string;
    vaultProvider?: string | null;
    vaultExternalItemRef?: string | null;
    vaultConnectionId?: string | null;
  };
  targetUrl: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Drives an automated sign-in using stored credentials. Secret values are passed
 * through Stagehand's `variables` substitution, so they are injected into the page
 * at execution time and are never sent to the model as prompt text.
 */
export async function performCredentialLogin({
  stagehand,
  credentials,
  log,
  usernameLabel,
}: {
  stagehand: Stagehand;
  credentials: RuntimeCredentialMaterial;
  log: (message: string) => void;
  /** The vendor's own label for the identifier field (e.g. "IAM username"), so
   *  the streamed step matches what's on screen. Falls back to "username". */
  usernameLabel?: string;
}): Promise<void> {
  // Stagehand's act() performs ONE action per call, so each field and the submit
  // are separate steps — a single "enter username and password and submit"
  // instruction would only fill the first field. Secrets go through `variables`
  // substitution, so only placeholders (not the values) ever reach the model.

  // Site-specific fields (workspace, subdomain, …) usually precede the password.
  const extraFields = credentials.extraFields ?? [];
  for (const field of extraFields) {
    log(`Entering ${field.label}.`);
    await stagehand.act(
      `Enter %value% into the "${field.label}" field on the sign-in form.`,
      { variables: { value: field.value } },
    );
    await delay(1000);
  }

  if (credentials.username) {
    // Show the vendor's real field name in the step; the fill stays semantic so
    // Stagehand still finds the field even if the label is approximate.
    log(`Entering ${usernameLabel?.trim() || 'username'}.`);
    await stagehand.act(
      'Enter %username% into the email or username field on the sign-in form.',
      { variables: { username: credentials.username } },
    );
    await delay(1000);
    // Two-step logins (Microsoft, Google, Okta) reveal the password only after a
    // Next/Continue; single-page forms (e.g. GitHub) already show it.
    await stagehand.act(
      'If no password field is visible yet, click the "Next" or "Continue" button to proceed. If a password field is already visible, do nothing.',
    );
    await delay(1000);
  }

  if (credentials.password) {
    log('Entering password.');
    await stagehand.act(
      'Enter %password% into the password field on the sign-in form.',
      { variables: { password: credentials.password } },
    );
    await delay(1000);
  }

  if (credentials.username || credentials.password) {
    log('Submitting the sign-in form.');
    await stagehand.act(
      'Click the "Sign in" or "Log in" button to submit the sign-in form.',
    );
    await delay(2000);
  }

  if (credentials.totpCode) {
    log('Entering one-time passcode.');
    await stagehand.act(
      'If a one-time passcode, two-factor, or verification code field is shown, enter %code% into it. If no such field is present, do nothing.',
      { variables: { code: credentials.totpCode } },
    );
    await delay(1500);
    await stagehand.act(
      'If there is a button to submit or verify the code, click it. Otherwise do nothing.',
    );
    await delay(2000);
  }
}

export interface CredentialReloginResult {
  isLoggedIn: boolean;
  page: ActivePage;
  reason?: string;
}

/**
 * Attempts to recover an expired session using credentials stored for the profile.
 * Returns `isLoggedIn: false` (with a reason) when no credentials exist or the
 * automated sign-in couldn't complete — e.g. a login step needs a human (SMS,
 * email code, push approval), which is left to the existing re-auth fallback.
 */
export async function reloginWithStoredCredentials({
  stagehand,
  sessions,
  vault,
  input,
  verifyLoggedIn,
  log,
}: {
  stagehand: Stagehand;
  sessions: BrowserbaseSessionService;
  vault: BrowserCredentialVaultAdapter;
  input: CredentialLoginTarget;
  verifyLoggedIn: () => Promise<boolean>;
  log: (message: string) => void;
}): Promise<CredentialReloginResult> {
  const resolveCredentials = () =>
    vault.resolveCredentialReference({
      profileId: input.profile.id,
      provider: input.profile.vaultProvider,
      externalItemRef: input.profile.vaultExternalItemRef,
      connectionId: input.profile.vaultConnectionId,
    });

  const credentials = await resolveCredentials();
  let page = await sessions.ensureActivePage(stagehand);

  if (!credentials) {
    return {
      isLoggedIn: false,
      page,
      reason: 'Session expired and no stored credentials are available.',
    };
  }

  page = await runLoginAttempt({
    stagehand,
    sessions,
    credentials,
    log,
  });
  if (await verifyLoggedIn()) return { isLoggedIn: true, page };

  // Retry once with a freshly resolved TOTP code, which guards against the ~30s
  // rotation boundary landing between resolve and submit.
  if (credentials.totpCode) {
    const fresh = await resolveCredentials();
    if (fresh?.totpCode) {
      page = await runLoginAttempt({
        stagehand,
        sessions,
        credentials: fresh,
        log,
      });
      if (await verifyLoggedIn()) return { isLoggedIn: true, page };
    }
  }

  return {
    isLoggedIn: false,
    page,
    reason: 'Automated sign-in did not complete; user action may be required.',
  };
}

async function runLoginAttempt({
  stagehand,
  sessions,
  credentials,
  log,
}: {
  stagehand: Stagehand;
  sessions: BrowserbaseSessionService;
  credentials: RuntimeCredentialMaterial;
  log: (message: string) => void;
}): Promise<ActivePage> {
  await performCredentialLogin({ stagehand, credentials, log });
  // Stay on the page the site lands on after login (typically an app/dashboard)
  // and verify there. Navigating back to the entered URL can return to a login
  // page — some apps always show login at the root — which reads as a failed
  // sign-in even though it succeeded. The evidence instruction navigates from
  // wherever we land.
  await delay(1500);
  return sessions.ensureActivePage(stagehand);
}

export type SignInOutcome =
  | 'logged_in'
  | 'invalid_credentials'
  | 'needs_2fa'
  | 'challenge'
  | 'unknown';

/**
 * Reads the current page after a sign-in attempt and classifies the outcome, so
 * the connect flow can tell the user what happened and route them correctly.
 * Never throws — an unreadable page degrades to 'unknown'.
 */
export async function classifyLoginOutcome(
  stagehand: Stagehand,
): Promise<SignInOutcome> {
  try {
    // Give the model where the browser actually is, so it can judge for itself
    // whether we're on the real app or still on a sign-in / identity-provider
    // page (it knows hosts like signin.aws.amazon.com or login.microsoftonline.com
    // without us hardcoding URL patterns). A hint only — falls back to content.
    let currentUrl = '';
    try {
      const pages = stagehand.context?.pages?.() ?? [];
      currentUrl = pages[pages.length - 1]?.url() ?? '';
    } catch {
      // URL unavailable — classify from page content alone.
    }
    const { state } = await stagehand.extract(
      (currentUrl ? `The browser is currently at this URL: ${currentUrl}\n\n` : '') +
        'Classify this page after a sign-in attempt, using BOTH the page content AND the URL. ' +
        'Return exactly one value: ' +
        '"logged_in" — there is clear evidence the user is signed in to the actual application ' +
        '(a dashboard, an account/avatar menu, or a "Sign out" control) AND the browser is on the ' +
        'application itself. If the URL is a sign-in, login, SSO, or identity-provider page, or the ' +
        'page is blank, loading, redirecting, or still shows a sign-in form or a "Sign in" / ' +
        '"Log in" button, it is NOT logged_in; ' +
        '"invalid_credentials" — it shows an incorrect username/email/password error; ' +
        '"needs_2fa" — it asks for a two-factor, one-time, authenticator, or verification code; ' +
        '"challenge" — it shows a CAPTCHA, a "verify it\'s you", a device-approval, or an email/SMS link step; ' +
        '"unknown" — none of the above clearly apply.',
      z.object({
        state: z.enum([
          'logged_in',
          'invalid_credentials',
          'needs_2fa',
          'challenge',
          'unknown',
        ]),
      }),
    );
    return state;
  } catch {
    return 'unknown';
  }
}

/**
 * The connect flow's first sign-in: fill the stored credentials and classify
 * where we land. Unlike reloginWithStoredCredentials (used by the scheduler),
 * this does NOT navigate back to the target afterward — the post-submit page is
 * exactly what we need to classify (an error, a 2FA prompt, a challenge, or a
 * signed-in dashboard).
 */
export async function signInAndClassify({
  stagehand,
  vault,
  input,
  log,
  usernameLabel,
}: {
  stagehand: Stagehand;
  vault: BrowserCredentialVaultAdapter;
  input: CredentialLoginTarget;
  log: (message: string) => void;
  /** Vendor's identifier-field label, for a truthful streamed step. */
  usernameLabel?: string;
}): Promise<{ outcome: SignInOutcome }> {
  const resolveCredentials = () =>
    vault.resolveCredentialReference({
      profileId: input.profile.id,
      provider: input.profile.vaultProvider,
      externalItemRef: input.profile.vaultExternalItemRef,
      connectionId: input.profile.vaultConnectionId,
    });

  const credentials = await resolveCredentials();
  if (!credentials) return { outcome: 'unknown' };

  await performCredentialLogin({ stagehand, credentials, log, usernameLabel });
  let outcome = await classifyLoginOutcome(stagehand);

  // A 2FA prompt still showing with a stored seed can mean the code landed on
  // the ~30s rotation boundary — retry once with a freshly generated code.
  if (outcome === 'needs_2fa' && credentials.totpCode) {
    const fresh = await resolveCredentials();
    if (fresh?.totpCode) {
      await performCredentialLogin({ stagehand, credentials: fresh, log, usernameLabel });
      outcome = await classifyLoginOutcome(stagehand);
    }
  }

  return { outcome };
}
