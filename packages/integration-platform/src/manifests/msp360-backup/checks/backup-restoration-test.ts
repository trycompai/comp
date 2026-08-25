import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { bearerHeaders, loginBackup } from '../auth';
import {
  daysAgo,
  isFailedStatus,
  isIncompleteStatus,
  isRestorePlan,
  isSuccessStatus,
  parseMonitoringPayload,
  parseTimestamp,
  rowId,
} from '../monitoring';

const RESTORE_WINDOW_DAYS = 90;

function inRestoreWindow(row: { LastStart?: string }): boolean {
  const started = parseTimestamp(row.LastStart);
  return !!started && daysAgo(started) <= RESTORE_WINDOW_DAYS;
}

export const backupRestorationTestCheck: IntegrationCheck = {
  id: 'backup-restoration-test',
  name: 'MSP360 backup restoration test',
  description:
    'Pass if a successful restore or restore-verification ran in the last 90 days. Fail a restore that ran in that window with a failed/incomplete status. N/A only when there is no restore-family job in that window.',
  service: 'backup',
  taskMapping: TASK_TEMPLATES.backupRestorationTest,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 Backup restoration-test check');

    const session = await loginBackup(ctx);
    if (!session) {
      return;
    }

    let payload: unknown;
    try {
      payload = await ctx.fetch<unknown>('/api/Monitoring', {
        baseUrl: session.baseUrl,
        headers: bearerHeaders(session.token),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'Failed to fetch MSP360 monitoring for restore tests',
        description: 'GET /api/Monitoring failed.',
        resourceType: 'connection',
        resourceId: 'msp360-restore-monitoring',
        severity: 'high',
        remediation: 'Confirm the API user can read monitoring data.',
        evidence: { error: message },
      });
      return;
    }

    const parsed = parseMonitoringPayload(payload);
    if (!parsed.ok) {
      ctx.fail({
        title: 'MSP360 monitoring payload was not a list',
        description:
          'GET /api/Monitoring did not return an array or a known list envelope. Collection failed rather than treating this as restore not in scope.',
        resourceType: 'connection',
        resourceId: 'msp360-restore-monitoring',
        severity: 'high',
        remediation: 'Confirm Comp AI received JSON from /api/Monitoring.',
        evidence: {
          payloadType: payload === null ? 'null' : typeof payload,
          keys:
            payload && typeof payload === 'object' && !Array.isArray(payload)
              ? Object.keys(payload as object).slice(0, 20)
              : null,
        },
      });
      return;
    }

    const rows = parsed.rows;
    const restoreRows = rows.filter(isRestorePlan);
    const checkedAt = new Date().toISOString();

    const recentSuccess = restoreRows.filter(
      (row) => inRestoreWindow(row) && isSuccessStatus(row.Status),
    );
    const recentFailed = restoreRows.filter(
      (row) => inRestoreWindow(row) && (isFailedStatus(row.Status) || isIncompleteStatus(row.Status)),
    );

    if (restoreRows.length === 0 || (recentSuccess.length === 0 && recentFailed.length === 0)) {
      ctx.pass({
        title: 'MSP360 restore test not in scope',
        description: `Monitoring has ${restoreRows.length} restore-family row(s) and none with a LastStart within ${RESTORE_WINDOW_DAYS} days. This is a process control, not a failed restore. Run a restore or enable Restore Verification when it is in scope.`,
        resourceType: 'control',
        resourceId: 'msp360-restore-not-in-scope',
        evidence: {
          restoreRowCount: restoreRows.length,
          restoreRows: restoreRows.slice(0, 25),
          windowDays: RESTORE_WINDOW_DAYS,
          outcome: 'not-in-scope',
          checkedAt,
        },
      });
      return;
    }

    for (const [index, row] of recentFailed.entries()) {
      ctx.fail({
        title: `Restore test failed: ${row.PlanName ?? rowId(row, index)}`,
        description: `Restore-family plan within ${RESTORE_WINDOW_DAYS} days did not succeed (Status=${String(row.Status)}, LastStart=${row.LastStart}).`,
        resourceType: 'restore-plan',
        resourceId: rowId(row, index),
        severity: 'high',
        remediation: 'Fix the restore or restore-verification plan and re-run it successfully.',
        evidence: {
          planName: row.PlanName,
          computerName: row.ComputerName,
          planType: row.PlanType,
          status: row.Status,
          lastStart: row.LastStart,
          errorMessage: row.ErrorMessage,
          detailedReportLink: row.DetailedReportLink,
          checkedAt,
        },
      });
    }

    for (const [index, row] of recentSuccess.entries()) {
      ctx.pass({
        title: `Restore test ok: ${row.PlanName ?? rowId(row, index)}`,
        description: `Successful restore-family plan within ${RESTORE_WINDOW_DAYS} days (LastStart=${row.LastStart}).`,
        resourceType: 'restore-plan',
        resourceId: rowId(row, index),
        evidence: {
          planName: row.PlanName,
          computerName: row.ComputerName,
          planType: row.PlanType,
          status: row.Status,
          lastStart: row.LastStart,
          detailedReportLink: row.DetailedReportLink,
          checkedAt,
        },
      });
    }
  },
};
