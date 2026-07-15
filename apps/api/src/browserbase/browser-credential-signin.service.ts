import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import {
  classifyLoginOutcome,
  signInAndClassify,
} from './browser-credential-login';
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
 * Performs the connect flow's first sign-in for a profile using the credentials
 * the user just stored — the same auto-fill the scheduler uses, run once up
 * front so the person never has to type into the raw browser. Runs on the
 * profile's own Browserbase context so the resulting cookies persist for later
 * scheduled runs. It classifies the outcome (wrong password, 2FA needed, a
 * human challenge, …) so the connect flow can explain what happened and route
 * the user to the right next step.
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
  }): Promise<AutoSignInResult> {
    const profile = await this.profiles.getProfile({
      profileId: input.profileId,
      organizationId: input.organizationId,
    });
    if (!profile) {
      throw new NotFoundException('Browser auth profile not found');
    }

    const { sessionId } = await this.sessions.createSessionWithContext(
      profile.contextId,
    );
    let stagehand: Stagehand | null = null;
    try {
      stagehand = await this.sessions.createStagehand(sessionId);
      const activeStagehand = stagehand;
      const page = await this.sessions.ensureActivePage(activeStagehand);
      await page.goto(input.url, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });
      await delay(1500);

      // The persisted context may already carry a valid session — no need to
      // re-enter credentials if we're already in.
      if ((await classifyLoginOutcome(activeStagehand)) === 'logged_in') {
        await this.profiles.markVerified(input);
        return { isLoggedIn: true };
      }

      const vault = resolveBrowserCredentialVaultAdapter();
      const { outcome } = await signInAndClassify({
        stagehand: activeStagehand,
        vault,
        input: { profile, targetUrl: input.url },
        log: (message) => this.logger.log(`[sign-in] ${message}`),
      });

      if (outcome === 'logged_in') {
        await this.profiles.markVerified(input);
        return { isLoggedIn: true };
      }

      // Narrowed to the failure states now that logged_in is handled.
      await this.profiles.markNeedsReauth({
        ...input,
        reason: FAILURE_REASON[outcome],
      });
      return { isLoggedIn: false, failure: outcome };
    } finally {
      if (stagehand) await this.sessions.safeCloseStagehand(stagehand);
      await this.sessions
        .closeSession(sessionId)
        .catch(() => undefined /* best-effort cleanup */);
    }
  }
}
