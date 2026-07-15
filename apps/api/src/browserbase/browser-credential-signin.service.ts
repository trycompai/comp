import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { reloginWithStoredCredentials } from './browser-credential-login';
import { resolveBrowserCredentialVaultAdapter } from './browser-credential-vault.factory';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AutoSignInResult {
  isLoggedIn: boolean;
  reason?: string;
}

/**
 * Performs the connect flow's first sign-in for a profile using the credentials
 * the user just stored — the same auto-fill the scheduler uses, run once up
 * front so the person never has to type into the raw browser. Runs on the
 * profile's own Browserbase context so the resulting cookies persist for later
 * scheduled runs. If an automated step can't complete (CAPTCHA, email/SMS code,
 * SSO), it returns `isLoggedIn: false` and the connect flow hands the live
 * browser to the user to finish.
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

      const verifyLoggedIn = () => this.isLoggedIn(activeStagehand);

      // The persisted context may already carry a valid session — no need to
      // re-enter credentials if we're already in.
      if (await verifyLoggedIn()) {
        await this.profiles.markVerified(input);
        return { isLoggedIn: true };
      }

      const vault = resolveBrowserCredentialVaultAdapter();
      const result = await reloginWithStoredCredentials({
        stagehand: activeStagehand,
        sessions: this.sessions,
        vault,
        input: { profile, targetUrl: input.url },
        verifyLoggedIn,
        log: (message) => this.logger.log(`[sign-in] ${message}`),
      });

      if (result.isLoggedIn) {
        await this.profiles.markVerified(input);
        return { isLoggedIn: true };
      }

      await this.profiles.markNeedsReauth({
        ...input,
        reason: result.reason,
      });
      return { isLoggedIn: false, reason: result.reason };
    } finally {
      if (stagehand) await this.sessions.safeCloseStagehand(stagehand);
      await this.sessions
        .closeSession(sessionId)
        .catch(() => undefined /* best-effort cleanup */);
    }
  }

  private async isLoggedIn(stagehand: Stagehand): Promise<boolean> {
    const result = await stagehand.extract(
      'Check if the user is logged in to this website. Look for a user avatar, ' +
        'profile menu, account dropdown, or login/sign-in buttons. Return true ' +
        'if logged in, false if you see login buttons or a login form.',
      z.object({ isLoggedIn: z.boolean() }),
    );
    return result.isLoggedIn;
  }
}
