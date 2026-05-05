export type PentestReportStatus =
  | 'provisioning'
  | 'cloning'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

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
  scanDepth?: ScanDepth;
  evidenceLevel?: EvidenceLevel;
  checks?: PentestCheck[];
}

export type ScanDepth = 'quick' | 'standard' | 'deep';
export type EvidenceLevel = 'report_only' | 'safe_proof' | 'impact_proof';
export type PentestCheck =
  | 'discovery'
  | 'secrets_info_disclosure'
  | 'technology_config'
  | 'xss'
  | 'injection'
  | 'authentication'
  | 'authorization'
  | 'idor_bola'
  | 'ssrf_xxe'
  | 'csrf'
  | 'race_conditions'
  | 'business_logic';

export interface PentestCreateRequest {
  targetUrl: string;
  repoUrl?: string;
  pipelineTesting?: boolean;
  testMode?: boolean;
  webhookUrl?: string;
  notificationEmail?: string;
  scanDepth?: ScanDepth;
  evidenceLevel?: EvidenceLevel;
  checks?: PentestCheck[];
}

export interface CreatePenetrationTestResponse {
  id: string;
  status?: PentestReportStatus;
}

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IssueStatus = 'open' | 'acknowledged' | 'resolved' | 'false_positive' | 'wont_fix';

// Mirrors @maced/api-client's Issue type. Kept as a lightweight frontend
// copy so we don't import server-only deps into the browser bundle.
export interface PentestIssue {
  id: string;
  runId?: string | null;
  findingId?: string | null;
  title: string;
  summary?: string | null;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  cve?: string | null;
  cweId?: string | null;
  cvssScore?: number | null;
  affectedEndpoint?: string | null;
  proofOfConcept?: string | null;
  impact?: string | null;
  remediation?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Agent-level event emitted during the run. Maced returns two shapes
// depending on kind:
//   - tool_use:    has `tool`, `summary` usually equals the tool name
//   - tool_result: has `summary` with the tool output (starts with "→"),
//                  sometimes `emphasis: "critical"` for load-bearing results
// Older fields (`description`, `raw`, `category`) are kept optional as a
// fallback for older events or future shape changes.
export interface PentestAgentEvent {
  id: string;
  agent: string;
  kind?: 'tool_use' | 'tool_result' | string;
  tool?: string | null;
  summary?: string | null;
  emphasis?: 'critical' | 'warning' | string | null;
  timestamp: number;
  // Legacy / fallback fields
  category?: string;
  turn?: number;
  description?: string | null;
  raw?: string;
}
