import { Injectable, Logger } from '@nestjs/common';
import Browserbase from '@browserbasehq/sdk';
import { z } from 'zod';
import {
  browserbaseUnavailableException,
  getBrowserbaseErrorText,
  isRetryableBrowserbaseUpstreamError,
} from './browserbase-upstream-error';
import { isNoPageError } from './run-error-formatter';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

// A larger native viewport keeps the embedded live view (and evidence
// screenshots) sharp: our panels are well under 1920px wide, so the viewer
// downscales rather than upscaling — the latter is what looked soft, especially
// on HiDPI/Retina displays. Browserbase exposes no device-pixel-ratio setting,
// so viewport size is the only lever for capture sharpness.
const BROWSER_WIDTH = 1920;
const BROWSER_HEIGHT = 1080;
// Model behind extract()/act() (reading pages, verdicts, form fills). Separate
// from the navigation (CUA) model and configurable via env; default unchanged.
const STAGEHAND_MODEL =
  process.env.BROWSERBASE_STAGEHAND_MODEL || 'anthropic/claude-sonnet-4-6';
const BROWSERBASE_API_MAX_ATTEMPTS = 3;
const BROWSERBASE_RETRY_DELAYS_MS = [250, 750];
const BROWSERBASE_DEFAULT_HEADERS = { 'accept-encoding': 'identity' };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class BrowserbaseSessionService {
  private readonly logger = new Logger(BrowserbaseSessionService.name);

  getBrowserbase() {
    return new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY,
      defaultHeaders: BROWSERBASE_DEFAULT_HEADERS,
    });
  }

  getProjectId() {
    return process.env.BROWSERBASE_PROJECT_ID || '';
  }

  async createBrowserbaseContext(): Promise<string> {
    return this.withBrowserbaseRetry({
      operationName: 'context creation',
      operation: async () => {
        const context = await this.getBrowserbase().contexts.create({
          projectId: this.getProjectId(),
        });
        return context.id;
      },
    });
  }

  async createSessionWithContext(
    contextId: string,
  ): Promise<{ sessionId: string; liveViewUrl: string }> {
    const bb = this.getBrowserbase();

    const session = await this.withBrowserbaseRetry({
      operationName: 'session creation',
      operation: () =>
        bb.sessions.create({
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
        }),
    });

    try {
      const debug = await this.withBrowserbaseRetry({
        operationName: 'session debug URL lookup',
        operation: () => bb.sessions.debug(session.id),
      });

      return {
        sessionId: session.id,
        liveViewUrl: debug.debuggerFullscreenUrl,
      };
    } catch (error) {
      try {
        await this.closeSession(session.id);
      } catch {
        // Ignore best-effort cleanup errors after a failed live-view lookup.
      }
      throw error;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.withBrowserbaseRetry({
      operationName: 'session close',
      operation: () =>
        this.getBrowserbase().sessions.update(sessionId, {
          projectId: this.getProjectId(),
          status: 'REQUEST_RELEASE',
        }),
    });
  }

  async getSessionContextId(sessionId: string): Promise<string | undefined> {
    const session = await this.withBrowserbaseRetry({
      operationName: 'session retrieval',
      operation: () => this.getBrowserbase().sessions.retrieve(sessionId),
    });
    return session.contextId;
  }

  async getSessionConnectUrl(sessionId: string): Promise<string> {
    const session = await this.withBrowserbaseRetry({
      operationName: 'session connect URL lookup',
      operation: () => this.getBrowserbase().sessions.retrieve(sessionId),
    });
    if (!session.connectUrl) {
      throw new Error('Browserbase session is missing a connect URL.');
    }
    return session.connectUrl;
  }

  private async withBrowserbaseRetry<T>({
    operation,
    operationName,
  }: {
    operation: () => Promise<T>;
    operationName: string;
  }): Promise<T> {
    for (
      let attempt = 1;
      attempt <= BROWSERBASE_API_MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await operation();
      } catch (error) {
        const retryable = isRetryableBrowserbaseUpstreamError(error);
        if (!retryable) {
          this.logger.error(`Browserbase ${operationName} failed`, {
            attempt,
            error: getBrowserbaseErrorText(error),
          });
          throw error;
        }

        if (attempt === BROWSERBASE_API_MAX_ATTEMPTS) {
          this.logger.error(`Browserbase ${operationName} failed`, {
            attempt,
            error: getBrowserbaseErrorText(error),
          });
          // Surface the underlying cause in the message so an exhausted retry
          // is diagnosable from the UI/response, not just the server logs.
          throw browserbaseUnavailableException(getBrowserbaseErrorText(error));
        }

        this.logger.warn(`Browserbase ${operationName} failed; retrying`, {
          attempt,
          error: getBrowserbaseErrorText(error),
        });
        await delay(BROWSERBASE_RETRY_DELAYS_MS[attempt - 1] ?? 1000);
      }
    }

    throw browserbaseUnavailableException();
  }

  async loadStagehand(): Promise<
    typeof import('@browserbasehq/stagehand').Stagehand
  > {
    const { Stagehand } = await import('@browserbasehq/stagehand');
    return Stagehand;
  }

  async createStagehand(sessionId: string): Promise<Stagehand> {
    const Stagehand = await this.loadStagehand();

    // Resolve the CDP connect URL ourselves with our identity-encoded client.
    // Stagehand's BROWSERBASE mode would instead call bb.sessions.retrieve on its
    // OWN Browserbase client, which lacks our accept-encoding:identity header and
    // so fails deterministically with "Premature close" (response decompression
    // mishandling) in our runtime — the same failure the identity header already
    // fixes for our own calls. Attaching via env:'LOCAL' + cdpUrl makes Stagehand
    // connect straight to the session over CDP without that call; extract/act/
    // agent then run locally against ANTHROPIC_API_KEY.
    const cdpUrl = await this.getSessionConnectUrl(sessionId);

    // A transient CDP attach can still fail; retry init, closing any
    // half-initialized instance between attempts to avoid leaking it. Stagehand
    // strips upstream error bodies from its throws, so forward its error logs.
    return this.withBrowserbaseRetry({
      operationName: 'stagehand initialization',
      operation: async () => {
        const stagehand = new Stagehand({
          env: 'LOCAL',
          localBrowserLaunchOptions: { cdpUrl },
          model: {
            modelName: STAGEHAND_MODEL,
            apiKey: process.env.ANTHROPIC_API_KEY,
          },
          verbose: 1,
          logger: (line) => {
            if ((line.level ?? 1) === 0) {
              this.logger.error(
                `Stagehand[${line.category ?? 'log'}]: ${line.message}`,
              );
            }
          },
        });

        try {
          await stagehand.init();
          return stagehand;
        } catch (error) {
          await this.safeCloseStagehand(stagehand);
          throw error;
        }
      },
    });
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
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    } finally {
      if (stagehand) {
        await this.safeCloseStagehand(stagehand);
      }
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
