import { Injectable, Logger } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';
import {
  analyzeDetectedLogin,
  loginDetectionSchema,
  manualLoginAnalysis,
  type LoginAnalysis,
} from './browser-login-analysis';

const EXTRACT_PROMPT =
  'Look at this sign-in page. Report: is it a real login page we can read; is a ' +
  'password field present; does the first login field accept an email, a username, ' +
  'or either; which third-party sign-in buttons are offered (e.g. Google, Microsoft, ' +
  'Okta, SSO); is passkey / security-key sign-in offered; and list any other fields ' +
  'required before the password (e.g. company, workspace, subdomain).';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opens a vendor's sign-in page in a throwaway cloud browser and detects which
 * login methods it supports, so the connect flow can recommend the most reliable
 * path. Reads a public page only — no credentials involved. Always degrades to a
 * manual fallback if the page can't be read.
 */
@Injectable()
export class BrowserLoginAnalyzerService {
  private readonly logger = new Logger(BrowserLoginAnalyzerService.name);

  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
  ) {}

  async analyzeLogin(url: string): Promise<LoginAnalysis> {
    let sessionId: string | null = null;
    let stagehand: Awaited<
      ReturnType<BrowserbaseSessionService['createStagehand']>
    > | null = null;
    try {
      // Session/context creation is inside the try so that an unavailable or
      // unconfigured Browserbase (e.g. missing BROWSERBASE_API_KEY) degrades to
      // the manual fallback instead of surfacing a 500 to the user.
      const contextId = await this.sessions.createBrowserbaseContext();
      const session = await this.sessions.createSessionWithContext(contextId);
      sessionId = session.sessionId;

      stagehand = await this.sessions.createStagehand(sessionId);
      const page = await this.sessions.ensureActivePage(stagehand);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 30000 });
      await delay(1500);

      // Navigate to the actual sign-in page so the customer can paste any URL
      // (a homepage, a dashboard) rather than the exact login page.
      await this.navigateToSignIn(stagehand);

      const detection = await stagehand.extract(
        EXTRACT_PROMPT,
        loginDetectionSchema,
      );
      return analyzeDetectedLogin(detection);
    } catch (err) {
      // A page we can't read (or a Browserbase hiccup) isn't an error the user
      // needs to see — fall back to manual entry so the connect flow continues.
      // Log the full error + stack so a misconfiguration is diagnosable and not
      // silently hidden behind the manual fallback.
      this.logger.warn('Login analysis failed; falling back to manual entry', {
        url,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return manualLoginAnalysis();
    } finally {
      if (stagehand) await this.sessions.safeCloseStagehand(stagehand);
      if (sessionId) {
        await this.sessions
          .closeSession(sessionId)
          .catch(() => undefined /* best-effort cleanup */);
      }
    }
  }

  // Best-effort navigation to the sign-in page. If the given URL is a homepage
  // or dashboard, the agent opens the "Sign in" link so the form is on screen
  // for detection. Never throws — extract runs on whatever page we end up on.
  private async navigateToSignIn(
    stagehand: Awaited<
      ReturnType<BrowserbaseSessionService['createStagehand']>
    >,
  ): Promise<void> {
    try {
      await stagehand.act(
        'If this page is not already a login or sign-in page, find and open the "Sign in" or "Log in" link so the sign-in form is visible. If a sign-in form is already shown, do nothing.',
      );
      await delay(1500);
    } catch {
      // Ignore — detection proceeds on the current page.
    }
  }
}
