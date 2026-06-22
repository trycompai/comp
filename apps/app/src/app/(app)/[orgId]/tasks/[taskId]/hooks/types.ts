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

export interface BrowserAutomation {
  id: string;
  name: string;
  description?: string;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string | null;
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
