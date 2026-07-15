import { Injectable } from '@nestjs/common';
import { TaskFrequency } from '@db';
import { tasks } from '@trigger.dev/sdk';
import { BrowserAutomationCrudService } from './browser-automation-crud.service';
import { BrowserAutomationExecutionService } from './browser-automation-execution.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserCredentialStorageService } from './browser-credential-storage.service';
import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { normalizeHostnameFromUrl } from './browserbase-url';

@Injectable()
export class BrowserbaseService {
  constructor(
    private readonly sessions: BrowserbaseSessionService = new BrowserbaseSessionService(),
    private readonly profiles: BrowserAuthProfileService = new BrowserAuthProfileService(
      sessions,
    ),
    private readonly screenshots: BrowserbaseScreenshotService = new BrowserbaseScreenshotService(),
    private readonly runner: BrowserEvidenceRunnerService = new BrowserEvidenceRunnerService(
      sessions,
      screenshots,
    ),
    private readonly automationCrud: BrowserAutomationCrudService = new BrowserAutomationCrudService(
      screenshots,
    ),
    private readonly automationExecution: BrowserAutomationExecutionService = new BrowserAutomationExecutionService(
      sessions,
      profiles,
      runner,
    ),
    private readonly credentialStorage: BrowserCredentialStorageService = new BrowserCredentialStorageService(),
  ) {}

  /**
   * Kicks off login analysis as a background Trigger.dev run (browser + AI, which
   * can outlast an HTTP/browser timeout) and returns a handle the client
   * subscribes to for the result.
   */
  async analyzeLogin(url: string): Promise<{
    runId: string;
    publicAccessToken: string;
  }> {
    const handle = await tasks.trigger('analyze-vendor-login', { url });
    return { runId: handle.id, publicAccessToken: handle.publicAccessToken };
  }

  async listAuthProfiles(organizationId: string) {
    return this.profiles.listProfiles(organizationId);
  }

  async getOrCreateAuthProfile(input: {
    organizationId: string;
    url: string;
    displayName?: string;
    loginIdentity?: string;
    vaultProvider?: string;
    vaultExternalItemRef?: string;
    vaultConnectionId?: string;
  }) {
    return this.profiles.getOrCreateProfileFromUrl(input);
  }

  async startAuthProfileSession(input: {
    organizationId: string;
    profileId: string;
  }) {
    return this.profiles.startProfileSession(input);
  }

  async verifyAuthProfileSession(input: {
    organizationId: string;
    profileId: string;
    sessionId: string;
    url: string;
  }) {
    return this.profiles.verifyProfileSession(input);
  }

  async markAuthProfileNeedsReauth(input: {
    organizationId: string;
    profileId: string;
    reason?: string;
  }) {
    return this.profiles.markNeedsReauth(input);
  }

  async storeAuthProfileCredentials(input: {
    organizationId: string;
    profileId: string;
    username: string;
    password: string;
    totpSeed?: string;
    extraFields?: { label: string; value: string }[];
  }) {
    return this.credentialStorage.storeProfileCredentials(input);
  }

  async getOrCreateOrgContext(organizationId: string) {
    return this.profiles.getOrCreateOrgContext(organizationId);
  }

  async getOrgContext(organizationId: string) {
    return this.profiles.getOrgContext(organizationId);
  }

  async createSessionWithContext(contextId: string) {
    return this.sessions.createSessionWithContext(contextId);
  }

  async closeSession(sessionId: string): Promise<void> {
    return this.sessions.closeSession(sessionId);
  }

  async navigateToUrl(sessionId: string, url: string) {
    return this.sessions.navigateToUrl(sessionId, url);
  }

  async checkLoginStatus(sessionId: string, url: string) {
    return this.sessions.checkLoginStatus(sessionId, url);
  }

  async createBrowserAutomation(
    data: {
      taskId: string;
      name: string;
      description?: string;
      targetUrl: string;
      instruction: string;
      evaluationCriteria?: string;
      scheduleFrequency?: TaskFrequency;
    },
    organizationId?: string,
  ) {
    return this.automationCrud.createBrowserAutomation(data, organizationId);
  }

  async getBrowserAutomation(automationId: string, organizationId?: string) {
    return this.automationCrud.getBrowserAutomation(
      automationId,
      organizationId,
    );
  }

  async getBrowserAutomationsForTask(taskId: string, organizationId?: string) {
    return this.automationCrud.getBrowserAutomationsForTask(
      taskId,
      organizationId,
    );
  }

  async updateBrowserAutomation(
    automationId: string,
    data: {
      name?: string;
      description?: string;
      targetUrl?: string;
      instruction?: string;
      evaluationCriteria?: string;
      isEnabled?: boolean;
      scheduleFrequency?: TaskFrequency;
    },
    organizationId?: string,
  ) {
    return this.automationCrud.updateBrowserAutomation(
      automationId,
      data,
      organizationId,
    );
  }

  async deleteBrowserAutomation(automationId: string, organizationId?: string) {
    return this.automationCrud.deleteBrowserAutomation(
      automationId,
      organizationId,
    );
  }

  async startAutomationWithLiveView(
    automationId: string,
    organizationId: string,
  ) {
    return this.automationExecution.startAutomationWithLiveView(
      automationId,
      organizationId,
    );
  }

  async executeAutomationOnSession(
    automationId: string,
    runId: string,
    sessionId: string,
    organizationId: string,
  ) {
    return this.automationExecution.executeAutomationOnSession(
      automationId,
      runId,
      sessionId,
      organizationId,
    );
  }

  async runBrowserAutomation(automationId: string, organizationId: string) {
    return this.automationExecution.runBrowserAutomation(
      automationId,
      organizationId,
    );
  }

  async getScreenshotRedirectUrl(input: {
    runId: string;
    organizationId: string;
    download?: boolean;
  }): Promise<string> {
    return this.screenshots.getScreenshotRedirectUrl(input);
  }

  async getRunWithPresignedUrl(runId: string, organizationId?: string) {
    return this.automationCrud.getRunWithPresignedUrl(runId, organizationId);
  }

  async getAutomationsWithPresignedUrls(
    taskId: string,
    organizationId?: string,
  ) {
    return this.automationCrud.getAutomationsWithPresignedUrls(
      taskId,
      organizationId,
    );
  }

  async getAutomationRuns(
    automationId: string,
    limit = 20,
    organizationId?: string,
  ) {
    return this.automationCrud.getAutomationRuns(
      automationId,
      limit,
      organizationId,
    );
  }

  async getAutomationRun(runId: string, organizationId?: string) {
    return this.automationCrud.getAutomationRun(runId, organizationId);
  }

  getHostnameFromUrl(url: string): string {
    return normalizeHostnameFromUrl(url);
  }
}
