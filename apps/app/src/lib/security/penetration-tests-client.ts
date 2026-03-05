export type PentestReportStatus = 'provisioning' | 'cloning' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PentestProgress {
  status: PentestReportStatus;
  completedAgents: number;
  totalAgents: number;
  elapsedMs: number;
}

export interface PentestRun {
  id: string;
  targetUrl: string;
  repoUrl?: string | null;
  status: PentestReportStatus;
  testMode?: boolean | null;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  failedReason?: string | null;
  temporalUiUrl?: string | null;
  webhookUrl?: string | null;
  notificationEmail?: string | null;
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
  notificationEmail?: string;
}

export interface CreatePenetrationTestResponse {
  id: string;
  status?: PentestReportStatus;
}
