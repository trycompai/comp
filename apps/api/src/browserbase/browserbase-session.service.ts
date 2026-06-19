import { Injectable, Logger } from '@nestjs/common';
import Browserbase from '@browserbasehq/sdk';
import { z } from 'zod';
import { isNoPageError } from './run-error-formatter';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const BROWSER_WIDTH = 1440;
const BROWSER_HEIGHT = 900;
const STAGEHAND_MODEL = 'anthropic/claude-sonnet-4-6';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class BrowserbaseSessionService {
  private readonly logger = new Logger(BrowserbaseSessionService.name);

  getBrowserbase() {
    return new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY,
    });
  }

  getProjectId() {
    return process.env.BROWSERBASE_PROJECT_ID || '';
  }

  async createBrowserbaseContext(): Promise<string> {
    const context = await this.getBrowserbase().contexts.create({
      projectId: this.getProjectId(),
    });
    return context.id;
  }

  async createSessionWithContext(
    contextId: string,
  ): Promise<{ sessionId: string; liveViewUrl: string }> {
    const bb = this.getBrowserbase();

    const session = await bb.sessions.create({
      projectId: this.getProjectId(),
      browserSettings: {
        context: {
          id: contextId,
          persist: true,
        },
        fingerprint: {
          screen: {
            maxHeight: BROWSER_HEIGHT,
            maxWidth: BROWSER_WIDTH,
            minHeight: BROWSER_HEIGHT,
            minWidth: BROWSER_WIDTH,
          },
        },
        viewport: { width: BROWSER_WIDTH, height: BROWSER_HEIGHT },
      },
      keepAlive: true,
    });

    const debug = await bb.sessions.debug(session.id);

    return {
      sessionId: session.id,
      liveViewUrl: debug.debuggerFullscreenUrl,
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.getBrowserbase().sessions.update(sessionId, {
      projectId: this.getProjectId(),
      status: 'REQUEST_RELEASE',
    });
  }

  async createStagehand(sessionId: string): Promise<Stagehand> {
    const { Stagehand } = await import('@browserbasehq/stagehand');
    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: this.getProjectId(),
      browserbaseSessionID: sessionId,
      model: {
        modelName: STAGEHAND_MODEL,
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      verbose: 1,
    });

    await stagehand.init();
    return stagehand;
  }

  async safeCloseStagehand(stagehand: Stagehand): Promise<void> {
    try {
      await stagehand.close();
    } catch (err) {
      this.logger.warn('Failed to close stagehand (ignored)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async ensureActivePage(stagehand: Stagehand) {
    const maxWaitMs = 5_000;
    const pollMs = 250;
    const startedAt = Date.now();

    while (Date.now() - startedAt < maxWaitMs) {
      const page = stagehand.context.pages().find((candidate) => {
        const maybePage = candidate as { isClosed?: () => boolean };
        return maybePage.isClosed ? !maybePage.isClosed() : true;
      });
      if (page) return page;
      await delay(pollMs);
    }

    return await stagehand.context.newPage();
  }

  async navigateToUrl(
    sessionId: string,
    url: string,
  ): Promise<{ success: boolean; error?: string }> {
    let stagehand: Stagehand | null = null;

    try {
      stagehand = await this.createStagehand(sessionId);
      const page = await this.ensureActivePage(stagehand);

      await page.sendCDP('WebAuthn.enable');
      await page.sendCDP('WebAuthn.addVirtualAuthenticator', {
        options: {
          protocol: 'ctap2',
          transport: 'internal',
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      });

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });

      return { success: true };
    } catch (err) {
      this.logger.error('Failed to navigate to URL', err);
      if (stagehand) {
        await this.safeCloseStagehand(stagehand);
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async checkLoginStatus(
    sessionId: string,
    url: string,
  ): Promise<{ isLoggedIn: boolean; username?: string }> {
    const stagehand = await this.createStagehand(sessionId);

    try {
      const page = await this.ensureActivePage(stagehand);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });
      await delay(1500);

      const loginSchema = z.object({
        isLoggedIn: z
          .boolean()
          .describe('Whether the user is currently logged in to this site'),
        username: z.string().optional().describe('The username if logged in'),
      });

      const result = await stagehand.extract(
        'Check if the user is logged in to this website. Look for a user avatar, profile menu, or account dropdown in the header/navigation. If logged in, extract the username if visible.',
        loginSchema,
      );

      return {
        isLoggedIn: result.isLoggedIn,
        username: result.username,
      };
    } catch (err) {
      if (isNoPageError(err)) {
        throw new Error(
          'Browser session ended before we could verify login status. Please retry.',
        );
      }
      throw err;
    } finally {
      await this.safeCloseStagehand(stagehand);
    }
  }
}
