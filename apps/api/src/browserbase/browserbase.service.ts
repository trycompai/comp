import { Injectable } from '@nestjs/common';
import { TaskFrequency } from '@db';
import { tasks } from '@trigger.dev/sdk';
import {
  BrowserAutomationCrudService,
  type BrowserAutomationStepInput,
} from './browser-automation-crud.service';
import { BrowserAutomationDraftService } from './browser-automation-draft.service';
import { BrowserAutomationExecutionService } from './browser-automation-execution.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserCredentialStorageService } from './browser-credential-storage.service';
import type {
  BrowserRunLivePhase,
  EvidenceTimelineStep,
} from './browser-evidence-step-timeline';
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

  // Drafts have no dependencies; a field avoids Nest trying to DI-resolve it.
  private readonly automationDrafts = new BrowserAutomationDraftService();

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

  /**
   * Kicks off a live test of an instruction the user hasn't saved yet. Creates
   * the session up front (so the client shows it as a live view), then runs the
   * instruction as a background Trigger.dev task that streams its steps. Nothing
   * is persisted — this only proves the instruction out before it's saved.
   */
  async testInstruction(input: {
    organizationId: string;
    taskId?: string;
    profileId?: string;
    targetUrl: string;
    instruction: string;
    evaluationCriteria?: string;
  }): Promise<{
    runId: string;
    publicAccessToken: string;
    sessionId: string;
    liveViewUrl: string;
  }> {
    const profile = await this.profiles.resolveProfileForTarget({
      organizationId: input.organizationId,
      targetUrl: input.targetUrl,
      profileId: input.profileId,
    });
    const { sessionId, liveViewUrl } =
      await this.createSessionWithContext(profile.contextId);
    const handle = await tasks.trigger('test-vendor-instruction', {
      organizationId: input.organizationId,
      taskId: input.taskId,
      profileId: profile.id,
      targetUrl: input.targetUrl,
      instruction: input.instruction,
      evaluationCriteria: input.evaluationCriteria,
      sessionId,
    });
    return {
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
      sessionId,
      liveViewUrl,
    };
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

  async updateAuthProfile(input: {
    organizationId: string;
    profileId: string;
    displayName?: string;
    url?: string;
  }) {
    return this.profiles.updateProfile(input);
  }

  async deleteAuthProfile(input: { organizationId: string; profileId: string }) {
    // Best-effort: remove the stored login from 1Password before dropping the
    // profile, so we don't leave orphaned secrets behind.
    const profile = await this.profiles.getProfile(input);
    if (profile?.vaultExternalItemRef) {
      await this.credentialStorage.deleteProfileCredentialItem(profile);
    }
    return this.profiles.deleteProfile(input);
  }

  async storeAuthProfileCredentials(input: {
    organizationId: string;
    profileId: string;
    username: string;
    password: string;
    totpSeed?: string;
    extraFields?: { label: string; value: string }[];
    usernameLabel?: string;
  }) {
    return this.credentialStorage.storeProfileCredentials(input);
  }

  /**
   * Kicks off the connect flow's first automated sign-in. Creates the browser
   * session up front (so the client can show it as a live view — the user
   * watches the auto-fill and takes over in place if it can't finish), then runs
   * the sign-in as a background Trigger.dev task on that session (browser + AI,
   * which can outlast an HTTP/browser timeout).
   */
  async signInAuthProfile(input: {
    organizationId: string;
    profileId: string;
    url: string;
    mode?: 'password' | 'sso';
    /** Vendor's identifier-field label, forwarded so the streamed step is truthful. */
    usernameLabel?: string;
  }): Promise<{
    runId: string;
    publicAccessToken: string;
    sessionId: string;
    liveViewUrl: string;
  }> {
    const { sessionId, liveViewUrl } = await this.profiles.startProfileSession({
      organizationId: input.organizationId,
      profileId: input.profileId,
    });
    const handle = await tasks.trigger('sign-in-vendor-profile', {
      ...input,
      sessionId,
    });
    return {
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
      sessionId,
      liveViewUrl,
    };
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
      steps?: BrowserAutomationStepInput[];
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
      steps?: BrowserAutomationStepInput[];
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

  async setTaskSchedule(
    taskId: string,
    scheduleFrequency: TaskFrequency,
    organizationId?: string,
  ) {
    return this.automationCrud.setTaskSchedule(
      taskId,
      scheduleFrequency,
      organizationId,
    );
  }

  // ===== Drafts (in-progress, unsaved automations) =====

  listAutomationDrafts(taskId: string, organizationId: string) {
    return this.automationDrafts.listDraftsForTask(taskId, organizationId);
  }

  createAutomationDraft(
    data: { taskId: string; name?: string; steps: unknown; createdById?: string | null },
    organizationId: string,
  ) {
    return this.automationDrafts.createDraft(data, organizationId);
  }

  updateAutomationDraft(
    draftId: string,
    data: { name?: string; steps?: unknown },
    organizationId: string,
  ) {
    return this.automationDrafts.updateDraft(draftId, data, organizationId);
  }

  deleteAutomationDraft(draftId: string, organizationId: string) {
    return this.automationDrafts.deleteDraft(draftId, organizationId);
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
    onSteps?: (steps: EvidenceTimelineStep[]) => void,
  ) {
    return this.automationExecution.executeAutomationOnSession(
      automationId,
      runId,
      sessionId,
      organizationId,
      onSteps,
    );
  }

  /** Runs the FULL step sequence on a live session, streaming the timeline. */
  async executeAutomationLive(
    automationId: string,
    runId: string,
    sessionId: string,
    organizationId: string,
    onSteps?: (steps: EvidenceTimelineStep[]) => void,
    onLiveView?: (url: string) => void,
    onLivePhase?: (phase: BrowserRunLivePhase) => void,
  ) {
    return this.automationExecution.executeAutomationLive(
      automationId,
      runId,
      sessionId,
      organizationId,
      onSteps,
      onLiveView,
      onLivePhase,
    );
  }

  /**
   * Kick off the interactive Run as a background task so the live view can
   * stream the AI's steps (same realtime mechanism as the Test flow). Returns a
   * handle the composer subscribes to for `runSteps` + the final result.
   */
  async startLiveAutomationExecution(input: {
    automationId: string;
    runId: string;
    sessionId: string;
    organizationId: string;
  }): Promise<{ runId: string; publicAccessToken: string }> {
    const handle = await tasks.trigger('execute-automation-live', input);
    return { runId: handle.id, publicAccessToken: handle.publicAccessToken };
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
