import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { signInAndClassify } from './browser-credential-login';
import {
  classifyLoginOutcome,
  classifyTwoFactorMethod,
  type TwoFactorMethod,
} from './browser-login-classifier';
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
  /**
   * For a take-over (not signed in): HOW the verification step wants the user to
   * verify, so the UI can give exact guidance — enter a code, switch off a
   * passkey, or that a passkey-only login can't be automated. Omitted when the
   * page couldn't be classified.
   */
  twoFactorMethod?: TwoFactorMethod;
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

  /**
   * Emit the live-view URL of the tab the AI is currently on, so the connect
   * flow's iframe follows it across new tabs. Best-effort — a failure just
   * leaves the live view on its current tab.
   */
  private async streamActiveLiveView(
    stagehand: Stagehand,
    sessionId: string,
    onLiveView?: (url: string) => void,
  ): Promise<void> {
    if (!onLiveView) return;
    try {
      const pages = stagehand.context?.pages?.() ?? [];
      const activeUrl = pages[pages.length - 1]?.url();
      const url = await this.sessions.getActivePageLiveViewUrl(sessionId, activeUrl);
      if (url) onLiveView(url);
    } catch {
      // Best-effort — keep the current live view.
    }
  }

  async signInWithStoredCredentials(input: {
    organizationId: string;
    profileId: string;
    url: string;
    sessionId: string;
    /** 'password' fills stored credentials; 'sso' drives to the identity provider. */
    mode?: 'password' | 'sso';
    /** The vendor's detected identifier-field label (e.g. "IAM username"), so the
     *  streamed step shows the real field name instead of a generic "username". */
    usernameLabel?: string;
    /** Live activity timeline, surfaced to the connect flow's activity panel. */
    onSteps?: (steps: SignInStep[]) => void;
    /** Follow the AI's tab: emit the live-view URL of the page it's actually on
     *  (a vendor may open sign-in in a new tab) so the UI iframe can follow it. */
    onLiveView?: (url: string) => void;
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
    // Persist the outcome of this attempt on the connection (diagnostic
    // breadcrumb for support). Best-effort inside the service — never throws.
    const record = (outcome: string, detail?: string | null) =>
      this.profiles.recordSignInAttempt({
        organizationId: input.organizationId,
        profileId: input.profileId,
        outcome,
        detail,
      });

    const profile = await this.profiles.getProfile({
      profileId: input.profileId,
      organizationId: input.organizationId,
    });
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }
    // The URL we sign in on must belong to this connection — otherwise the
    // stored username/password/TOTP would be typed into an unrelated site.
    this.profiles.assertUrlMatchesProfileHostname({
      url: input.url,
      profileHostname: profile.hostname,
    });

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
        await record('logged_in', 'Existing session was still valid.');
        finish('done');
        return { isLoggedIn: true, homeUrl: page.url() };
      }

      // Get onto the actual sign-in form first — the entered URL may be a
      // homepage or dashboard rather than the login page.
      step('Finding the sign-in form');
      await navigateToSignIn(activeStagehand);
      // The sign-in may have opened in a new tab — point the live view at
      // wherever the AI actually is, so the user watches (and can complete a
      // 2FA take-over on) the right page.
      await this.streamActiveLiveView(activeStagehand, input.sessionId, input.onLiveView);

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
        // The identity provider often opens in a new tab — follow it.
        await this.streamActiveLiveView(activeStagehand, input.sessionId, input.onLiveView);
        step('Finish signing in with your provider');
        await record('sso_handoff', FAILURE_REASON.sso_handoff);
        finish('warn');
        return { isLoggedIn: false, failure: 'sso_handoff' };
      }

      const vault = resolveBrowserCredentialVaultAdapter();
      const { outcome } = await signInAndClassify({
        stagehand: activeStagehand,
        vault,
        input: { profile, targetUrl: input.url },
        log: step,
        // On reconnect the caller doesn't pass a label (no capture form), so fall
        // back to the one detected + stored at connect time.
        usernameLabel: input.usernameLabel ?? profile.identifierLabel ?? undefined,
      });
      // The sign-in attempt navigated — often to a 2FA / verification page, and
      // sometimes in a new tab. Re-point the live view at the tab the classifier
      // just judged (same newest-tab selection it used), so a take-over — e.g.
      // typing the 2FA code — happens on the page the user actually sees. Without
      // this the iframe stays on the pre-submit login tab and the code field is
      // invisible, which is exactly the "your turn, but I can't see the field"
      // state users hit.
      await this.streamActiveLiveView(
        activeStagehand,
        input.sessionId,
        input.onLiveView,
      );
      step('Checking whether that worked');

      if (outcome === 'logged_in') {
        await this.profiles.markVerified(input);
        await record('logged_in');
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
      await record(outcome, FAILURE_REASON[outcome]);
      finish('warn');

      // A human is about to take over a verification step — read HOW the page
      // wants them to verify (enter a code, switch off a passkey, or a
      // passkey-only login we can't automate) so the UI gives exact guidance.
      // Best-effort: undefined just falls back to the generic take-over copy.
      let twoFactorMethod: TwoFactorMethod | undefined;
      if (outcome === 'needs_2fa' || outcome === 'challenge') {
        twoFactorMethod = await classifyTwoFactorMethod(activeStagehand);
      }
      return { isLoggedIn: false, failure: outcome, twoFactorMethod };
    } catch (error) {
      // An unexpected error (session/navigation/model failure) is exactly the
      // kind of thing a "can't connect" ticket is about — record it, then let
      // it propagate unchanged so the caller's handling is untouched.
      await record(
        'error',
        error instanceof Error ? error.message : 'Automated sign-in errored.',
      );
      throw error;
    } finally {
      // Release our automation handle but leave the session open — the caller
      // shows it to the user (to watch, or to take over) and closes it later.
      if (stagehand) await this.sessions.safeCloseStagehand(stagehand);
    }
  }
}
