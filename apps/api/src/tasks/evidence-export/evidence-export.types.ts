/**
 * Evidence Export Types
 * Normalized data structures for automation evidence export
 */

/**
 * Normalized evidence run - combines app automations and custom automations into a unified format
 */
export interface NormalizedEvidenceRun {
  id: string;
  type: 'app_automation' | 'custom_automation';
  automationName: string;
  automationId: string;
  status: 'success' | 'failed' | 'running' | 'pending' | 'cancelled';
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  // Summary metrics
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  // Evaluation (for custom automations)
  evaluationStatus: 'pass' | 'fail' | null;
  evaluationReason: string | null;
  // Content
  logs: unknown;
  output: unknown;
  error: string | null;
  // Results (for app automations)
  results: NormalizedEvidenceResult[];
  createdAt: Date;
}

/**
 * Normalized evidence result - individual check results
 */
export interface NormalizedEvidenceResult {
  id: string;
  passed: boolean;
  resourceType: string;
  resourceId: string;
  title: string;
  description: string | null;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical' | null;
  remediation: string | null;
  evidence: unknown;
  collectedAt: Date;
}

/**
 * Normalized automation - groups runs by automation
 */
export interface NormalizedAutomation {
  id: string;
  name: string;
  type: 'app_automation' | 'custom_automation';
  // For app automations
  integrationName?: string;
  integrationLogoUrl?: string;
  checkId?: string;
  // Runs
  runs: NormalizedEvidenceRun[];
  // Summary
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  latestRunAt: Date | null;
}

/**
 * Task evidence summary - all automations for a task
 */
export interface TaskEvidenceSummary {
  taskId: string;
  taskTitle: string;
  organizationId: string;
  organizationName: string;
  automations: NormalizedAutomation[];
  exportedAt: Date;
}

/**
 * Export options for evidence
 */
export interface EvidenceExportOptions {
  includeRawJson: boolean;
  format: 'pdf' | 'zip';
}

/**
 * Export result
 */
export interface EvidenceExportResult {
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
}
