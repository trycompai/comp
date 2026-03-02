export type PentestReportStatus = 'provisioning' | 'cloning' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PentestProgress {
  status: PentestReportStatus;
  phase: string | null;
  agent: string | null;
  completedAgents: number;
  totalAgents: number;
  elapsedMs: number;
}

export interface PentestRun {
  id: string;
  sandboxId: string;
  workflowId: string;
  sessionId: string;
  targetUrl: string;
  repoUrl?: string | null;
  status: PentestReportStatus;
  testMode?: boolean | null;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  temporalUiUrl?: string | null;
  webhookUrl?: string | null;
  userId: string;
  organizationId: string;
  progress?: PentestProgress;
}

export interface PentestCreateRequest {
  targetUrl: string;
  repoUrl?: string;
  githubToken?: string;
  configYaml?: string;
  pipelineTesting?: boolean;
  testMode?: boolean;
  workspace?: string;
  webhookUrl?: string;
  mockCheckout?: boolean;
}

export interface CreateVulnerabilityReportResponse {
  checkoutMode?: 'mock' | 'stripe';
  runId?: string;
  id?: string;
  status?: string;
  checkoutUrl: string;
}
