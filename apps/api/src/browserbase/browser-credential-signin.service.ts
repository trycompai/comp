import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import {
  classifyLoginOutcome,
  signInAndClassify,
} from './browser-credential-login';
import { navigateToSignIn } from './browser-login-navigation';
import { resolveBrowserCredentialVaultAdapter } from './browser-credential-vault.factory';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type AutoSignInFailure =
  | 'invalid_credentials'
  | 'needs_2fa'
  | 'challenge'
  // SSO: the AI opened the identity provider; the user finishes the login there.
  | 'sso_handoff'
  | 'unknown';

export interface SignInStep {
  /** Step label. */
  l: string;
  /** Clock timestamp, e.g. "06:02:14". */
  t: string;
  state: 'done' | 'active' | 'pending' | 'warn' | 'fail';
}

const clock = () =>
  new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export interface AutoSignInResult {
  isLoggedIn: boolean;
  /** Why the automated sign-in couldn't complete (set only when not signed in). */
  failure?: AutoSignInFailure;
  /**
   * The page the app landed on after a successful login — an authenticated URL to
   * target on future runs, so they reuse the session instead of re-logging in
   * (e.g. sites whose root always shows a login form).
   */
  homeUrl?: string;
}

const FAILURE_REASON: Record<AutoSignInFailure, string> = {
  invalid_credentials: 'The stored username or password was not accepted.',
  needs_2fa: 'The account requires a two-factor code to sign in.',
  challenge: 'The site asked for a human verification step.',
  sso_handoff: 'Finish signing in with your identity provider.',
  unknown: 'Automated sign-in could not complete.',
};

/**
 * Performs the connect flow's first sign-in on a session the caller already
 * created and is showing to the user as a live view. The user watches the
 * auto-fill happen; if it can't finish (wrong password, 2FA, a human
 * challenge), we leave the session open on the exact page it stopped on so the
 * user can take over. We only close our own Stagehand handle — never the
 * session, which the caller owns.
 */
@Injectable()
export class BrowserCredentialSigninService {
  private readonly logger = new Logger(BrowserCredentialSigninService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly profiles: BrowserAuthProfileService = new BrowserAuthProfileService(
      sessions,
    ),
  ) {}

  async signInWithStoredCredentials(input: {
    organizationId: string;
    profileId: string;
    url: string;
    sessionId: string;
    /** 'password' fills stored credentials; 'sso' drives to the identity provider. */
    mode?: 'password' | 'sso';
    /** Live activity timeline, surfaced to the connect flow's activity panel. */
    onSteps?: (steps: SignInStep[]) => void;
  }): Promise<AutoSignInResult> {
    const mode = input.mode ?? 'password';
    const steps: SignInStep[] = [];
    const emit = () => input.onSteps?.(steps.map((s) => ({ ...s })));
    // Each call advances the timeline: the prior active step becomes done and a
    // new active step is appended.
    const step = (label: string) => {
      const last = steps[steps.length - 1];
      if (last?.state === 'active') last.state = 'done';
      steps.push({ l: label, t: clock(), state: 'active' });
      this.logger.log(`[sign-in] ${label}`);
      emit();
    };
    const finish = (state: SignInStep['state']) => {
      const last = steps[steps.length - 1];
      if (last) last.state = state;
      emit();
    };

    const profile = await this.profiles.getProfile({
      profileId: input.profileId,
      organizationId: input.organizationId,
    });
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }

    let stagehand: Stagehand | null = null;
    try {
      stagehand = await this.sessions.createStagehand(input.sessionId);
      const activeStagehand = stagehand;
      const page = await this.sessions.ensureActivePage(activeStagehand);
      step('Opening the sign-in page');
      await page.goto(input.url, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });
      await delay(1500);

      // The persisted context may already carry a valid session — no need to
      // re-enter credentials if we're already in. The classifier is URL-aware, so
      // it won't call a mid-redirect / sign-in page "logged in" (the AWS false
      // positive) — it decides from the page AND where the browser actually is.
      step('Checking if you’re already signed in');
      if ((await classifyLoginOutcome(activeStagehand)) === 'logged_in') {
        await this.profiles.markVerified(input);
        finish('done');
        return { isLoggedIn: true, homeUrl: page.url() };
      }

      // Get onto the actual sign-in form first — the entered URL may be a
      // homepage or dashboard rather than the login page.
      step('Finding the sign-in form');
      await navigateToSignIn(activeStagehand);

      // SSO: we can't hold the customer's identity-provider credentials, so the
      // AI only clicks through to the provider, then hands the live browser to
      // the user to finish there (their IdP login + MFA).
      if (mode === 'sso') {
        step('Opening your single sign-on provider');
        try {
          await activeStagehand.act(
            "Click the option to sign in with single sign-on (SSO) or an identity provider — buttons labeled like 'Sign in with SSO', 'Continue with Google/Microsoft/Okta', 'Use SSO', or a company login. Do not type any username or password.",
          );
        } catch {
          // Best effort — if we can't find the button, the user can click it in
          // the live browser during take-over.
        }
        await delay(2500);
        step('Finish signing in with your provider');
        finish('warn');
        return { isLoggedIn: false, failure: 'sso_handoff' };
      }

      const vault = resolveBrowserCredentialVaultAdapter();
      const { outcome } = await signInAndClassify({
        stagehand: activeStagehand,
        vault,
        input: { profile, targetUrl: input.url },
        log: step,
      });
      step('Checking whether that worked');

      if (outcome === 'logged_in') {
        await this.profiles.markVerified(input);
        finish('done');
        // Re-read the active page: signing in usually navigates to an app/home page.
        const landed = await this.sessions.ensureActivePage(activeStagehand);
        return { isLoggedIn: true, homeUrl: landed.url() };
      }

      // Narrowed to the failure states now that logged_in is handled.
      await this.profiles.markNeedsReauth({
        organizationId: input.organizationId,
        profileId: input.profileId,
        reason: FAILURE_REASON[outcome],
      });
      finish('warn');
      return { isLoggedIn: false, failure: outcome };
    } finally {
      // Release our automation handle but leave the session open — the caller
      // shows it to the user (to watch, or to take over) and closes it later.
      if (stagehand) await this.sessions.safeCloseStagehand(stagehand);
    }
  }
}
