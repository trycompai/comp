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
  | 'unknown';

export interface AutoSignInResult {
  isLoggedIn: boolean;
  /** Why the automated sign-in couldn't complete (set only when not signed in). */
  failure?: AutoSignInFailure;
}

const FAILURE_REASON: Record<AutoSignInFailure, string> = {
  invalid_credentials: 'The stored username or password was not accepted.',
  needs_2fa: 'The account requires a two-factor code to sign in.',
  challenge: 'The site asked for a human verification step.',
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
    /** Live, user-facing progress (surfaced to the connect flow as narration). */
    onStatus?: (message: string) => void;
  }): Promise<AutoSignInResult> {
    const status = (message: string) => {
      this.logger.log(`[sign-in] ${message}`);
      input.onStatus?.(message);
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
      status('Opening the sign-in page…');
      await page.goto(input.url, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });
      await delay(1500);

      // The persisted context may already carry a valid session — no need to
      // re-enter credentials if we're already in.
      status('Checking if you’re already signed in…');
      if ((await classifyLoginOutcome(activeStagehand)) === 'logged_in') {
        await this.profiles.markVerified(input);
        return { isLoggedIn: true };
      }

      // Get onto the actual sign-in form first — the entered URL may be a
      // homepage or dashboard rather than the login page.
      status('Finding the sign-in form…');
      await navigateToSignIn(activeStagehand);

      const vault = resolveBrowserCredentialVaultAdapter();
      const { outcome } = await signInAndClassify({
        stagehand: activeStagehand,
        vault,
        input: { profile, targetUrl: input.url },
        log: status,
      });
      status('Checking whether that worked…');

      if (outcome === 'logged_in') {
        await this.profiles.markVerified(input);
        return { isLoggedIn: true };
      }

      // Narrowed to the failure states now that logged_in is handled.
      await this.profiles.markNeedsReauth({
        organizationId: input.organizationId,
        profileId: input.profileId,
        reason: FAILURE_REASON[outcome],
      });
      return { isLoggedIn: false, failure: outcome };
    } finally {
      // Release our automation handle but leave the session open — the caller
      // shows it to the user (to watch, or to take over) and closes it later.
      if (stagehand) await this.sessions.safeCloseStagehand(stagehand);
    }
  }
}
