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

      const detection = await stagehand.extract(
        EXTRACT_PROMPT,
        loginDetectionSchema,
      );
      return analyzeDetectedLogin(detection);
    } catch (err) {
      // A page we can't read (or a Browserbase hiccup) isn't an error the user
      // needs to see — fall back to manual entry so the connect flow continues.
      this.logger.warn('Login analysis failed; falling back to manual entry', {
        error: err instanceof Error ? err.message : String(err),
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
}
