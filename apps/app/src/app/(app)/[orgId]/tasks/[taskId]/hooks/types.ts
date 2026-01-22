export interface BrowserAutomationRun {
  id: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  screenshotUrl?: string;
  evaluationStatus?: 'pass' | 'fail' | null;
  evaluationReason?: string | null;
  error?: string;
}

export interface BrowserAutomation {
  id: string;
  name: string;
  description?: string;
  targetUrl: string;
  instruction: string;
  isEnabled: boolean;
  schedule?: string;
  createdAt: string;
  runs?: BrowserAutomationRun[];
}

export interface ContextResponse {
  contextId: string;
  isNew: boolean;
}

export interface SessionResponse {
  sessionId: string;
  liveViewUrl: string;
}

export interface AuthStatusResponse {
  isLoggedIn: boolean;
  username?: string;
}

export interface StartLiveResponse {
  runId: string;
  sessionId: string;
  liveViewUrl: string;
  error?: string;
  needsReauth?: boolean;
}

export interface ExecuteResponse {
  success: boolean;
  screenshotUrl?: string;
  error?: string;
  needsReauth?: boolean;
}

export type BrowserContextStatus = 'loading' | 'no-context' | 'has-context' | 'checking';
