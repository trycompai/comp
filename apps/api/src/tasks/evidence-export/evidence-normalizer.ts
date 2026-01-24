/**
 * Evidence Normalizer
 * Transforms app automation and custom automation runs into a unified format
 */

import type {
  NormalizedEvidenceRun,
  NormalizedEvidenceResult,
  NormalizedAutomation,
  TaskEvidenceSummary,
} from './evidence-export.types';

interface AppAutomationRun {
  id: string;
  checkId: string;
  checkName: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  errorMessage: string | null;
  logs: unknown;
  createdAt: Date;
  connection: {
    provider?: {
      slug: string;
      name: string;
    };
  };
  results: Array<{
    id: string;
    passed: boolean;
    resourceType: string;
    resourceId: string;
    title: string;
    description: string | null;
    severity: string | null;
    remediation: string | null;
    evidence: unknown;
    collectedAt: Date;
  }>;
}

interface CustomAutomationRun {
  id: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  runDuration: number | null;
  success: boolean | null;
  error: string | null;
  logs: unknown;
  output: unknown;
  evaluationStatus: string | null;
  evaluationReason: string | null;
  createdAt: Date;
  evidenceAutomation: {
    id: string;
    name: string;
  };
}

/**
 * Normalize an app automation run to the unified format
 */
export function normalizeAppAutomationRun(
  run: AppAutomationRun,
): NormalizedEvidenceRun {
  return {
    id: run.id,
    type: 'app_automation',
    automationName: run.checkName,
    automationId: run.checkId,
    status: normalizeStatus(run.status),
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    totalChecked: run.totalChecked,
    passedCount: run.passedCount,
    failedCount: run.failedCount,
    evaluationStatus: null,
    evaluationReason: null,
    logs: run.logs,
    output: null,
    error: run.errorMessage,
    results: run.results.map(normalizeResult),
    createdAt: run.createdAt,
  };
}

/**
 * Normalize a custom automation run to the unified format
 */
export function normalizeCustomAutomationRun(
  run: CustomAutomationRun,
): NormalizedEvidenceRun {
  const hasPassed = run.evaluationStatus === 'pass';
  const hasFailed = run.evaluationStatus === 'fail';

  return {
    id: run.id,
    type: 'custom_automation',
    automationName: run.evidenceAutomation.name,
    automationId: run.evidenceAutomation.id,
    status: normalizeStatus(run.status),
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.runDuration,
    totalChecked: hasPassed || hasFailed ? 1 : 0,
    passedCount: hasPassed ? 1 : 0,
    failedCount: hasFailed ? 1 : 0,
    evaluationStatus: run.evaluationStatus as 'pass' | 'fail' | null,
    evaluationReason: run.evaluationReason,
    logs: run.logs,
    output: run.output,
    error: run.error,
    results: [],
    createdAt: run.createdAt,
  };
}

/**
 * Normalize a check result
 */
function normalizeResult(result: {
  id: string;
  passed: boolean;
  resourceType: string;
  resourceId: string;
  title: string;
  description: string | null;
  severity: string | null;
  remediation: string | null;
  evidence: unknown;
  collectedAt: Date;
}): NormalizedEvidenceResult {
  return {
    id: result.id,
    passed: result.passed,
    resourceType: result.resourceType,
    resourceId: result.resourceId,
    title: result.title,
    description: result.description,
    severity: result.severity as
      | 'info'
      | 'low'
      | 'medium'
      | 'high'
      | 'critical'
      | null,
    remediation: result.remediation,
    evidence: result.evidence,
    collectedAt: result.collectedAt,
  };
}

/**
 * Normalize status to unified format
 */
function normalizeStatus(
  status: string,
): 'success' | 'failed' | 'running' | 'pending' | 'cancelled' {
  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
      return 'success';
    case 'failed':
    case 'error':
      return 'failed';
    case 'running':
      return 'running';
    case 'pending':
      return 'pending';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

/**
 * Group app automation runs by check
 */
export function groupAppAutomationRuns(
  runs: AppAutomationRun[],
): NormalizedAutomation[] {
  const grouped = new Map<string, NormalizedAutomation>();

  for (const run of runs) {
    const key = run.checkId;
    const normalized = normalizeAppAutomationRun(run);

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: run.checkId,
        name: run.checkName,
        type: 'app_automation',
        integrationName: run.connection.provider?.name,
        checkId: run.checkId,
        runs: [],
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        latestRunAt: null,
      });
    }

    const automation = grouped.get(key)!;
    automation.runs.push(normalized);
    automation.totalRuns++;

    if (normalized.status === 'success' && normalized.failedCount === 0) {
      automation.successfulRuns++;
    } else if (normalized.status === 'failed' || normalized.failedCount > 0) {
      automation.failedRuns++;
    }

    if (
      !automation.latestRunAt ||
      normalized.createdAt > automation.latestRunAt
    ) {
      automation.latestRunAt = normalized.createdAt;
    }
  }

  // Sort runs by date descending
  for (const automation of grouped.values()) {
    automation.runs.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  return Array.from(grouped.values());
}

/**
 * Group custom automation runs by automation
 */
export function groupCustomAutomationRuns(
  runs: CustomAutomationRun[],
): NormalizedAutomation[] {
  const grouped = new Map<string, NormalizedAutomation>();

  for (const run of runs) {
    const key = run.evidenceAutomation.id;
    const normalized = normalizeCustomAutomationRun(run);

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: run.evidenceAutomation.id,
        name: run.evidenceAutomation.name,
        type: 'custom_automation',
        runs: [],
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        latestRunAt: null,
      });
    }

    const automation = grouped.get(key)!;
    automation.runs.push(normalized);
    automation.totalRuns++;

    if (normalized.evaluationStatus === 'pass') {
      automation.successfulRuns++;
    } else if (
      normalized.evaluationStatus === 'fail' ||
      normalized.status === 'failed'
    ) {
      automation.failedRuns++;
    }

    if (
      !automation.latestRunAt ||
      normalized.createdAt > automation.latestRunAt
    ) {
      automation.latestRunAt = normalized.createdAt;
    }
  }

  // Sort runs by date descending
  for (const automation of grouped.values()) {
    automation.runs.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  return Array.from(grouped.values());
}

/**
 * Build a task evidence summary from app and custom automation runs
 */
export function buildTaskEvidenceSummary(params: {
  taskId: string;
  taskTitle: string;
  organizationId: string;
  organizationName: string;
  appAutomationRuns: AppAutomationRun[];
  customAutomationRuns: CustomAutomationRun[];
}): TaskEvidenceSummary {
  const appAutomations = groupAppAutomationRuns(params.appAutomationRuns);
  const customAutomations = groupCustomAutomationRuns(
    params.customAutomationRuns,
  );

  return {
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    automations: [...appAutomations, ...customAutomations],
    exportedAt: new Date(),
  };
}
