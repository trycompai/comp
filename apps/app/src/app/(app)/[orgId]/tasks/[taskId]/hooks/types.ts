import type { TaskFrequency } from '@db';

export interface BrowserAutomationRun {
  id: string;
  profileId?: string | null;
  status: string;
  createdAt: string;
  completedAt?: string;
  screenshotUrl?: string;
  evaluationStatus?: 'pass' | 'fail' | null;
  evaluationReason?: string | null;
  error?: string;
  failureCode?: string | null;
  failureStage?: string | null;
  blockedReason?: string | null;
  finalUrl?: string | null;
  attemptCount?: number;
}

/** One step of a (possibly multi-vendor) automation, as returned by the API. */
export interface BrowserAutomationStep {
  id: string;
  order: number;
  profileId?: string | null;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string | null;
}

/** A step as sent to the API on create/update (no id/order — order is positional). */
export interface BrowserAutomationStepInput {
  profileId?: string | null;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string | null;
}

/** A step inside a draft — everything optional, since a draft can be half-written. */
export interface DraftStep {
  profileId?: string | null;
  targetUrl?: string | null;
  instruction?: string | null;
  evaluationCriteria?: string | null;
}

/** An in-progress (unsaved) automation, persisted server-side so it resumes. */
export interface BrowserAutomationDraft {
  id: string;
  taskId: string;
  name?: string | null;
  steps: DraftStep[];
  createdAt: string;
  updatedAt: string;
}

export interface BrowserAutomation {
  id: string;
  name: string;
  description?: string;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string | null;
  steps?: BrowserAutomationStep[];
  isEnabled: boolean;
  schedule?: string;
  scheduleFrequency?: TaskFrequency;
  lastRunAt?: string | null;
  createdAt: string;
  runs?: BrowserAutomationRun[];
}

export interface ContextResponse {
  contextId: string;
  isNew: boolean;
}

export type BrowserAuthProfileStatus = 'unverified' | 'verified' | 'needs_reauth' | 'blocked';

export interface BrowserAuthProfile {
  id: string;
  hostname: string;
  loginIdentity: string;
  displayName: string;
  contextId: string;
  status: BrowserAuthProfileStatus;
  lastVerifiedAt?: string | null;
  lastAuthCheckUrl?: string | null;
  blockedReason?: string | null;
  vaultProvider?: string | null;
  vaultExternalItemRef?: string | null;
  vaultConnectionId?: string | null;
}

export interface BrowserLoginCredentials {
  username: string;
  password: string;
  totpSeed?: string;
}

export type LoginRecommendationCategory = 'ready' | 'works_with_checkins' | 'manual';

export interface LoginAnalysis {
  reachable: boolean;
  detectedMethods: string[];
  identifierType: string;
  extraFields: { label: string }[];
  recommendation: {
    category: LoginRecommendationCategory;
    headline: string;
    detail: string;
  };
}

export interface ResolveAuthProfileResponse {
  profile: BrowserAuthProfile;
  isNew: boolean;
}

export interface SessionResponse {
  sessionId: string;
  liveViewUrl: string;
}

export interface NavigateResponse {
  success: boolean;
  error?: string;
}

export interface AuthStatusResponse {
  isLoggedIn: boolean;
  username?: string;
}

export interface StartLiveResponse {
  runId: string;
  sessionId: string;
  liveViewUrl: string;
  profileId?: string;
  error?: string;
  needsReauth?: boolean;
}

export interface ExecuteResponse {
  success: boolean;
  screenshotUrl?: string;
  error?: string;
  needsReauth?: boolean;
  failureCode?: string;
  blockedReason?: string;
}

export type BrowserContextStatus = 'loading' | 'no-context' | 'has-context' | 'checking';

/** Final result of an ad-hoc instruction test run (mirrors the API task output). */
export interface InstructionTestResult {
  success: boolean;
  screenshotUrl?: string;
  finalUrl?: string;
  evaluationStatus?: 'pass' | 'fail';
  evaluationReason?: string;
  error?: string;
  needsReauth?: boolean;
  failureCode?: string;
  blockedReason?: string;
}
