import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { bearerHeaders, loginBackup } from '../auth';
import {
  asMonitoringRows,
  daysAgo,
  isRestorePlan,
  isSuccessStatus,
  parseTimestamp,
  rowId,
} from '../monitoring';

const RESTORE_WINDOW_DAYS = 90;

export const backupRestorationTestCheck: IntegrationCheck = {
  id: 'backup-restoration-test',
  name: 'MSP360 backup restoration test',
  description:
    'Pass if at least one successful restore or restore-verification plan ran in the last 90 days (MonitoringPlanType restore family).',
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

    const rows = asMonitoringRows(payload);
    const restoreRows = rows.filter(isRestorePlan);
    const checkedAt = new Date().toISOString();

    const recentSuccess = restoreRows.filter((row) => {
      const started = parseTimestamp(row.LastStart);
      if (!started || daysAgo(started) > RESTORE_WINDOW_DAYS) {
        return false;
      }
      return isSuccessStatus(row.Status);
    });

    if (recentSuccess.length === 0) {
      ctx.fail({
        title: 'No successful MSP360 restore test in the last 90 days',
        description: `Found ${restoreRows.length} restore-family monitoring row(s), none with a successful LastStart within ${RESTORE_WINDOW_DAYS} days. Monitoring is latest-run only.`,
        resourceType: 'service',
        resourceId: 'msp360-restore-test',
        severity: 'high',
        remediation:
          'Run a restore (or enable Restore Verification on image backups) so Monitoring shows a successful restore-family plan, then re-run this check.',
        evidence: {
          restoreRowCount: restoreRows.length,
          restoreRows: restoreRows.slice(0, 25),
          windowDays: RESTORE_WINDOW_DAYS,
          checkedAt,
        },
      });
      return;
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
