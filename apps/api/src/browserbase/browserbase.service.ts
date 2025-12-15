import { Injectable, Logger } from '@nestjs/common';
import Browserbase from '@browserbasehq/sdk';
import { Stagehand } from '@browserbasehq/stagehand';
import { db } from '@trycompai/db';
import { z } from 'zod';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BROWSER_WIDTH = 1440;
const BROWSER_HEIGHT = 900;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PENDING_CONTEXT_ID = '__PENDING__';

const isPrismaUniqueConstraintError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if (!('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'P2002';
};

@Injectable()
export class BrowserbaseService {
  private readonly logger = new Logger(BrowserbaseService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.bucketName = process.env.APP_AWS_BUCKET_NAME || 'comp-attachments';
  }

  private getBrowserbase() {
    return new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY,
    });
  }

  private getProjectId() {
    return process.env.BROWSERBASE_PROJECT_ID || '';
  }

  /**
   * Stagehand sometimes has no active page (or the page gets closed mid-run),
   * which causes errors like: "No Page found for awaitActivePage: no page available".
   * Ensure there's at least one non-closed page available, and create one if needed.
   */
  private async ensureActivePage(stagehand: Stagehand) {
    const MAX_WAIT_MS = 5000;
    const POLL_MS = 250;
    const startedAt = Date.now();

    while (Date.now() - startedAt < MAX_WAIT_MS) {
      // Stagehand's Page type doesn't always expose Playwright's `isClosed()` in typings.
      // We still want to filter out closed pages at runtime when possible.
      const pages = stagehand.context.pages().filter((p) => {
        const maybeIsClosed = (p as { isClosed?: () => boolean }).isClosed;
        return typeof maybeIsClosed === 'function' ? !maybeIsClosed() : true;
      });
      if (pages[0]) return pages[0];
      await delay(POLL_MS);
    }

    // Last resort: create a page (may still fail if the CDP session already died)
    return await stagehand.context.newPage();
  }

  // ===== Organization Context Management =====

  async getOrCreateOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string; isNew: boolean }> {
    // Fast path: already created
    const existing = await db.browserbaseContext.findUnique({
      where: { organizationId },
    });

    if (existing && existing.contextId !== PENDING_CONTEXT_ID) {
      return { contextId: existing.contextId, isNew: false };
    }

    try {
      await db.browserbaseContext.create({
        data: {
          organizationId,
          contextId: PENDING_CONTEXT_ID,
        },
      });

      const bb = this.getBrowserbase();
      const context = await bb.contexts.create({
        projectId: this.getProjectId(),
      });

      await db.browserbaseContext.update({
        where: { organizationId },
        data: { contextId: context.id },
      });

      return { contextId: context.id, isNew: true };
    } catch (error) {
      if (!isPrismaUniqueConstraintError(error)) {
        throw error;
      }
    }

    const MAX_WAIT_MS = 10_000;
    const POLL_MS = 200;
    const startedAt = Date.now();

    while (Date.now() - startedAt < MAX_WAIT_MS) {
      const current = await db.browserbaseContext.findUnique({
        where: { organizationId },
      });

      if (current && current.contextId !== PENDING_CONTEXT_ID) {
        return { contextId: current.contextId, isNew: false };
      }

      if (!current) {
        return await this.getOrCreateOrgContext(organizationId);
      }

      await delay(POLL_MS);
    }

    this.logger.warn(
      `Timed out waiting for Browserbase context creation for org ${organizationId}`,
    );
    throw new Error(
      'Browser context initialization is taking too long. Please retry.',
    );
  }

  async getOrgContext(
    organizationId: string,
  ): Promise<{ contextId: string } | null> {
    const context = await db.browserbaseContext.findUnique({
      where: { organizationId },
    });

    if (!context) return null;
    return { contextId: context.contextId };
  }

  // ===== Session Management =====

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
    const bb = this.getBrowserbase();
    await bb.sessions.update(sessionId, {
      projectId: this.getProjectId(),
      status: 'REQUEST_RELEASE',
    });
  }

  // ===== Stagehand helpers =====

  private async createStagehand(sessionId: string): Promise<Stagehand> {
    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: this.getProjectId(),
      browserbaseSessionID: sessionId,
      model: {
        modelName: 'claude-3-7-sonnet-latest',
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      verbose: 1,
    });

    await stagehand.init();
    return stagehand;
  }

  private async safeCloseStagehand(stagehand: Stagehand) {
    try {
      await stagehand.close();
    } catch (err) {
      // IMPORTANT: never let cleanup errors override a successful run
      this.logger.warn('Failed to close stagehand (ignored)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ===== Browser Actions =====

  async navigateToUrl(
    sessionId: string,
    url: string,
  ): Promise<{ success: boolean; error?: string }> {
    let stagehand: Stagehand | null = null;

    try {
      stagehand = await this.createStagehand(sessionId);
      const page = stagehand.context.pages()[0];
      if (!page) {
        throw new Error('No page found in browser session');
      }

      // Set up virtual authenticator to bypass passkeys via CDP
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
        try {
          await stagehand.close();
        } catch (closeErr) {
          this.logger.warn('Failed to close stagehand after navigation error', {
            closeErr:
              closeErr instanceof Error
                ? closeErr.message
                : 'Unknown close error',
          });
        }
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
    // Don't close - user needs to interact via Live View
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

      // Use extract to check login status
      const loginSchema = z.object({
        isLoggedIn: z
          .boolean()
          .describe('Whether the user is currently logged in to this site'),
        username: z.string().optional().describe('The username if logged in'),
      });

      const result = (await stagehand.extract(
        'Check if the user is logged in to this website. Look for a user avatar, profile menu, or account dropdown in the header/navigation. If logged in, extract the username if visible.',
        loginSchema as any,
      )) as { isLoggedIn: boolean; username?: string };

      return {
        isLoggedIn: result.isLoggedIn,
        username: result.username,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isNoPage =
        message.includes('awaitActivePage') ||
        message.includes('no page available') ||
        message.includes('No page found');
      if (isNoPage) {
        throw new Error(
          'Browser session ended before we could verify login status. Please retry.',
        );
      }
      throw err;
    } finally {
      await this.safeCloseStagehand(stagehand);
    }
  }

  // ===== Browser Automation CRUD =====

  async createBrowserAutomation(data: {
    taskId: string;
    name: string;
    description?: string;
    targetUrl: string;
    instruction: string;
    schedule?: string;
  }) {
    return db.browserAutomation.create({
      data: {
        taskId: data.taskId,
        name: data.name,
        description: data.description,
        targetUrl: data.targetUrl,
        instruction: data.instruction,
        schedule: data.schedule,
        isEnabled: true, // Enable by default so scheduled runs work
      },
    });
  }

  async getBrowserAutomation(automationId: string) {
    return db.browserAutomation.findUnique({
      where: { id: automationId },
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getBrowserAutomationsForTask(taskId: string) {
    return db.browserAutomation.findMany({
      where: { taskId },
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBrowserAutomation(
    automationId: string,
    data: {
      name?: string;
      description?: string;
      targetUrl?: string;
      instruction?: string;
      schedule?: string;
      isEnabled?: boolean;
    },
  ) {
    return db.browserAutomation.update({
      where: { id: automationId },
      data,
    });
  }

  async deleteBrowserAutomation(automationId: string) {
    return db.browserAutomation.delete({
      where: { id: automationId },
    });
  }

  // ===== Browser Automation Execution =====

  /**
   * Start an automation run with a live session that the user can watch
   */
  async startAutomationWithLiveView(
    automationId: string,
    organizationId: string,
  ): Promise<{
    runId: string;
    sessionId: string;
    liveViewUrl: string;
    error?: string;
    needsReauth?: boolean;
  }> {
    const automation = await db.browserAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    const context = await this.getOrgContext(organizationId);
    if (!context) {
      return {
        runId: '',
        sessionId: '',
        liveViewUrl: '',
        needsReauth: true,
        error: 'No browser context found. Please connect your browser first.',
      };
    }

    // Create a run record
    const run = await db.browserAutomationRun.create({
      data: {
        automationId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Create session with live view
    const { sessionId, liveViewUrl } = await this.createSessionWithContext(
      context.contextId,
    );

    return {
      runId: run.id,
      sessionId,
      liveViewUrl,
    };
  }

  /**
   * Execute an automation on an existing session (for live view runs)
   */
  async executeAutomationOnSession(
    automationId: string,
    runId: string,
    sessionId: string,
    organizationId: string,
  ): Promise<{
    success: boolean;
    screenshotUrl?: string;
    evaluationStatus?: 'pass' | 'fail';
    evaluationReason?: string;
    error?: string;
    needsReauth?: boolean;
  }> {
    const automation = await db.browserAutomation.findUnique({
      where: { id: automationId },
      include: {
        task: {
          select: { title: true, description: true },
        },
      },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    const run = await db.browserAutomationRun.findUnique({
      where: { id: runId },
    });

    if (!run) {
      throw new Error('Run not found');
    }

    try {
      const result = await this.executeAutomation(
        sessionId,
        automation.targetUrl,
        automation.instruction,
        {
          title: automation.task.title,
          description: automation.task.description,
        },
      );

      if (!result.success) {
        // Store evaluation data even on failure (requirement not met)
        await db.browserAutomationRun.update({
          where: { id: runId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            durationMs: run.startedAt
              ? Date.now() - run.startedAt.getTime()
              : 0,
            error: result.error,
            evaluationStatus: result.evaluationStatus,
            evaluationReason: result.evaluationReason,
          },
        });

        return {
          success: false,
          error: result.error,
          evaluationStatus: result.evaluationStatus,
          evaluationReason: result.evaluationReason,
          needsReauth: result.needsReauth,
        };
      }

      // Upload screenshot to S3 (only taken if evaluation passed)
      let screenshotKey: string | undefined;
      let presignedUrl: string | undefined;
      if (result.screenshot) {
        screenshotKey = await this.uploadScreenshot(
          organizationId,
          automationId,
          runId,
          result.screenshot,
        );
        presignedUrl = await this.getPresignedUrl(screenshotKey);
      }

      // Update run as completed
      await db.browserAutomationRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs: run.startedAt ? Date.now() - run.startedAt.getTime() : 0,
          screenshotUrl: screenshotKey,
          evaluationStatus: result.evaluationStatus ?? null,
          evaluationReason: result.evaluationReason ?? 'Screenshot captured',
        },
      });

      return {
        success: true,
        screenshotUrl: presignedUrl,
        evaluationStatus: result.evaluationStatus,
        evaluationReason: result.evaluationReason,
      };
    } catch (err) {
      this.logger.error('Failed to execute automation on session', err);

      await db.browserAutomationRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          durationMs: run.startedAt ? Date.now() - run.startedAt.getTime() : 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });

      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async runBrowserAutomation(
    automationId: string,
    organizationId: string,
  ): Promise<{
    runId: string;
    success: boolean;
    screenshotUrl?: string;
    evaluationStatus?: 'pass' | 'fail';
    evaluationReason?: string;
    error?: string;
    needsReauth?: boolean;
  }> {
    // Get the automation with task context
    const automation = await db.browserAutomation.findUnique({
      where: { id: automationId },
      include: {
        task: {
          select: { title: true, description: true },
        },
      },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    // Get org context
    const context = await this.getOrgContext(organizationId);
    if (!context) {
      return {
        runId: '',
        success: false,
        needsReauth: true,
        error: 'No browser context found. Please connect your browser first.',
      };
    }

    // Create a run record
    const run = await db.browserAutomationRun.create({
      data: {
        automationId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      // Create a session
      const { sessionId } = await this.createSessionWithContext(
        context.contextId,
      );

      try {
        const result = await this.executeAutomation(
          sessionId,
          automation.targetUrl,
          automation.instruction,
          {
            title: automation.task.title,
            description: automation.task.description,
          },
        );

        if (!result.success) {
          // Update run as failed - include evaluation data if requirement not met
          await db.browserAutomationRun.update({
            where: { id: run.id },
            data: {
              status: 'failed',
              completedAt: new Date(),
              durationMs: Date.now() - run.startedAt!.getTime(),
              error: result.error,
              evaluationStatus: result.evaluationStatus,
              evaluationReason: result.evaluationReason,
            },
          });

          return {
            runId: run.id,
            success: false,
            error: result.error,
            evaluationStatus: result.evaluationStatus,
            evaluationReason: result.evaluationReason,
            needsReauth: result.needsReauth,
          };
        }

        // Upload screenshot to S3 (only taken if evaluation passed)
        let screenshotKey: string | undefined;
        let presignedUrl: string | undefined;
        if (result.screenshot) {
          screenshotKey = await this.uploadScreenshot(
            organizationId,
            automationId,
            run.id,
            result.screenshot,
          );
          presignedUrl = await this.getPresignedUrl(screenshotKey);
        }

        // Update run as completed
        await db.browserAutomationRun.update({
          where: { id: run.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            durationMs: Date.now() - run.startedAt!.getTime(),
            screenshotUrl: screenshotKey,
            evaluationStatus: result.evaluationStatus ?? null,
            evaluationReason: result.evaluationReason ?? 'Screenshot captured',
          },
        });

        return {
          runId: run.id,
          success: true,
          screenshotUrl: presignedUrl,
          evaluationStatus: result.evaluationStatus,
          evaluationReason: result.evaluationReason,
        };
      } finally {
        // Always attempt to close the session, but never let cleanup override success
        try {
          await this.closeSession(sessionId);
        } catch (err) {
          this.logger.warn('Failed to close Browserbase session (ignored)', {
            sessionId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      this.logger.error('Failed to run browser automation', err);

      // Update run as failed
      await db.browserAutomationRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          durationMs: run.startedAt ? Date.now() - run.startedAt.getTime() : 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      });

      return {
        runId: run.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async executeAutomation(
    sessionId: string,
    targetUrl: string,
    instruction: string,
    taskContext?: { title: string; description?: string | null },
  ): Promise<{
    success: boolean;
    screenshot?: string;
    evaluationStatus?: 'pass' | 'fail';
    evaluationReason?: string;
    error?: string;
    needsReauth?: boolean;
  }> {
    const stagehand = await this.createStagehand(sessionId);

    try {
      let page = await this.ensureActivePage(stagehand);

      // Navigate to target URL
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeoutMs: 30000,
      });
      await delay(1000);

      // Check if we need to authenticate (look for login page indicators)
      const loginSchema = z.object({
        isLoggedIn: z.boolean(),
      });
      const authCheck = (await stagehand.extract(
        'Check if the user is logged in to this website. Look for a user avatar, profile menu, account dropdown, or login/sign-in buttons. Return true if logged in, false if you see login buttons or a login form.',
        loginSchema as any,
      )) as { isLoggedIn: boolean };

      if (!authCheck.isLoggedIn) {
        return {
          success: false,
          needsReauth: true,
          error: 'Session expired. Please re-authenticate in browser settings.',
        };
      }

      // Execute the navigation instruction using Stagehand agent
      const fullInstruction = `${instruction}. After completing all navigation steps, stop and wait.`;

      await stagehand
        .agent({
          cua: true,
          model: {
            modelName: 'anthropic/claude-3-7-sonnet-latest',
            apiKey: process.env.ANTHROPIC_API_KEY,
          },
        })
        .execute({
          instruction: fullInstruction,
          maxSteps: 20,
        });

      // Wait for final page to settle
      await delay(2000);

      // Always take a screenshot at the end (no pass/fail criteria gate)
      page = await this.ensureActivePage(stagehand);
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      });

      return {
        success: true,
        screenshot: screenshot.toString('base64'),
        evaluationReason: taskContext
          ? `Navigation completed for "${taskContext.title}". Screenshot captured.`
          : 'Navigation completed. Screenshot captured.',
      };
    } catch (err) {
      this.logger.error('Failed to execute automation', err);
      const message = err instanceof Error ? err.message : String(err);
      const isNoPage =
        message.includes('awaitActivePage') ||
        message.includes('no page available') ||
        message.includes('No page found');
      return {
        success: false,
        needsReauth: isNoPage ? true : undefined,
        error: isNoPage
          ? 'Browser session ended before we could capture evidence. Please retry.'
          : message,
      };
    } finally {
      await this.safeCloseStagehand(stagehand);
    }
  }

  private async uploadScreenshot(
    organizationId: string,
    automationId: string,
    runId: string,
    base64Screenshot: string,
  ): Promise<string> {
    const buffer = Buffer.from(base64Screenshot, 'base64');
    const key = `browser-automations/${organizationId}/${automationId}/${runId}.jpg`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
      }),
    );

    // Return just the key - we'll generate presigned URLs when viewing
    return key;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getRunWithPresignedUrl(runId: string) {
    const run = await db.browserAutomationRun.findUnique({
      where: { id: runId },
    });

    if (!run) return null;

    if (run.screenshotUrl) {
      const presignedUrl = await this.getPresignedUrl(run.screenshotUrl);
      return { ...run, screenshotUrl: presignedUrl };
    }

    return run;
  }

  async getAutomationsWithPresignedUrls(taskId: string) {
    const automations = await this.getBrowserAutomationsForTask(taskId);

    return Promise.all(
      automations.map(async (automation) => {
        const runsWithUrls = await Promise.all(
          automation.runs.map(async (run) => {
            if (run.screenshotUrl) {
              const presignedUrl = await this.getPresignedUrl(
                run.screenshotUrl,
              );
              return { ...run, screenshotUrl: presignedUrl };
            }
            return run;
          }),
        );
        return { ...automation, runs: runsWithUrls };
      }),
    );
  }

  // ===== Run History =====

  async getAutomationRuns(automationId: string, limit = 20) {
    return db.browserAutomationRun.findMany({
      where: { automationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAutomationRun(runId: string) {
    return db.browserAutomationRun.findUnique({
      where: { id: runId },
    });
  }
}
