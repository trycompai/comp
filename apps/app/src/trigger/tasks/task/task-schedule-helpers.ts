/**
 * Helper types and functions for task-schedule logic
 * Extracted for testability
 */

import type {
  EvidenceAutomationEvaluationStatus,
  IntegrationRunStatus,
  TaskStatus,
} from '@trycompai/db';

export type TargetStatus = Extract<TaskStatus, 'done' | 'todo' | 'failed'>;

export interface CustomAutomation {
  id: string;
  runs: Array<{
    evaluationStatus: EvidenceAutomationEvaluationStatus | null;
  }>;
}

export interface AppAutomationRun {
  checkId: string;
  status: IntegrationRunStatus;
  createdAt: Date;
}

export interface TaskAutomationData {
  evidenceAutomations: CustomAutomation[];
  integrationCheckRuns: AppAutomationRun[];
}

/**
 * Determines the target status for a task based on its automation state.
 *
 * Logic:
 * - No automations configured → 'todo'
 * - All automations passing → 'done' (keep current status)
 * - Any automation failing → 'failed'
 *
 * Custom Automations (EvidenceAutomation):
 * - Must have isEnabled = true (already filtered in query)
 * - Latest run must have evaluationStatus = 'pass'
 *
 * App Automations (IntegrationCheckRun):
 * - Groups by checkId
 * - Latest run for each checkId must have status = 'success'
 */
export const getTargetStatus = (task: TaskAutomationData): TargetStatus => {
  // Custom Automations: isEnabled = true AND latest run evaluationStatus = 'pass'
  const hasCustomAutomations = task.evidenceAutomations.length > 0;
  const customAutomationsPassing =
    hasCustomAutomations &&
    task.evidenceAutomations.every((automation) => {
      const latestRun = automation.runs[0];
      return latestRun?.evaluationStatus === 'pass';
    });

  // App Automations: Group by checkId and check latest run for each check type
  const hasAppAutomations = task.integrationCheckRuns.length > 0;
  let appAutomationsPassing = false;

  if (hasAppAutomations) {
    // Group runs by checkId and get the latest for each (order-independent)
    const latestRunByCheckId = new Map<string, AppAutomationRun>();
    for (const run of task.integrationCheckRuns) {
      const existing = latestRunByCheckId.get(run.checkId);
      if (!existing || run.createdAt > existing.createdAt) {
        latestRunByCheckId.set(run.checkId, run);
      }
    }

    // All check types must have status = 'success'
    appAutomationsPassing = Array.from(latestRunByCheckId.values()).every(
      (run) => run.status === 'success',
    );
  }

  // If no automations configured at all → move to "todo"
  if (!hasCustomAutomations && !hasAppAutomations) {
    return 'todo';
  }

  // If automations are configured, check if all are passing
  const allPassing =
    (!hasCustomAutomations || customAutomationsPassing) &&
    (!hasAppAutomations || appAutomationsPassing);

  if (allPassing) {
    return 'done';
  }

  // Some automations are failing → move to "failed"
  return 'failed';
};

/**
 * Calculate next due date based on review date and frequency
 */
export const calculateNextDueDate = (
  reviewDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
): Date => {
  const addDaysToDate = (date: Date, days: number): Date => {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  };

  const addMonthsToDate = (date: Date, months: number): Date => {
    const result = new Date(date.getTime());
    const originalDayOfMonth = result.getDate();
    result.setMonth(result.getMonth() + months);
    if (result.getDate() < originalDayOfMonth) {
      result.setDate(0);
    }
    return result;
  };

  switch (frequency) {
    case 'daily':
      return addDaysToDate(reviewDate, 1);
    case 'weekly':
      return addDaysToDate(reviewDate, 7);
    case 'monthly':
      return addMonthsToDate(reviewDate, 1);
    case 'quarterly':
      return addMonthsToDate(reviewDate, 3);
    case 'yearly':
      return addMonthsToDate(reviewDate, 12);
  }
};
