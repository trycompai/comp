import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { bearerHeaders, loginBackup } from '../auth';
import {
  asMonitoringRows,
  daysAgo,
  isBackupPlan,
  isFailedStatus,
  isSuccessStatus,
  parseTimestamp,
  rowId,
} from '../monitoring';

const STALE_AFTER_DAYS = 10;

/**
 * Comp AI backup-logs wants ~10 consecutive days of job history. MBS GET /api/Monitoring
 * is latest run only. We pass when every in-scope backup plan's LastStart is within 10 days
 * and status is success; fail stale or failed jobs. CSV export is a manual supplement.
 */
export const backupLogsCheck: IntegrationCheck = {
  id: 'backup-logs',
  name: 'MSP360 backup logs (latest monitoring)',
  description:
    'Latest backup plan runs from GET /api/Monitoring. Pass if each in-scope backup LastStart is within 10 days and succeeded.',
  service: 'backup',
  taskMapping: TASK_TEMPLATES.backupLogs,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 Backup logs check');

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
        title: 'Failed to fetch MSP360 monitoring',
        description: 'GET /api/Monitoring failed. Backup log evidence cannot be collected.',
        resourceType: 'connection',
        resourceId: 'msp360-monitoring',
        severity: 'high',
        remediation: 'Confirm the API user can read monitoring data in the management console.',
        evidence: { error: message },
      });
      return;
    }

    const rows = asMonitoringRows(payload);
    const backupRows = rows.filter(isBackupPlan);
    const checkedAt = new Date().toISOString();

    ctx.pass({
      title: 'MSP360 backup monitoring summary',
      description: `Monitoring returned ${rows.length} latest plan run(s); ${backupRows.length} in-scope backup plan(s). API is latest-run only, not a 10-day log file. For day-by-day history export CSV from Reporting → Backup history if auditors require it.`,
      resourceType: 'service',
      resourceId: 'msp360-backup-monitoring-summary',
      evidence: {
        totalRows: rows.length,
        backupPlanCount: backupRows.length,
        limitation: 'GET /api/Monitoring returns the latest run per plan, not 10 consecutive days',
        checkedAt,
      },
    });

    if (backupRows.length === 0) {
      ctx.fail({
        title: 'No in-scope MSP360 backup plans',
        description: 'Monitoring had no backup-family plans to evaluate.',
        resourceType: 'service',
        resourceId: 'msp360-backup-plans',
        severity: 'medium',
        remediation: 'Create backup plans on managed endpoints, then re-run this check.',
        evidence: { totalRows: rows.length, checkedAt },
      });
      return;
    }

    for (const [index, row] of backupRows.entries()) {
      const id = rowId(row, index);
      const started = parseTimestamp(row.LastStart);
      const ageDays = started ? daysAgo(started) : Number.POSITIVE_INFINITY;
      const stale = !started || ageDays > STALE_AFTER_DAYS;
      const failed = isFailedStatus(row.Status);
      const success = isSuccessStatus(row.Status) && !stale;

      const evidence = {
        planName: row.PlanName,
        computerName: row.ComputerName,
        companyName: row.CompanyName,
        planType: row.PlanType,
        status: row.Status,
        lastStart: row.LastStart,
        errorMessage: row.ErrorMessage,
        detailedReportLink: row.DetailedReportLink,
        ageDays: Number.isFinite(ageDays) ? Math.round(ageDays * 10) / 10 : null,
        checkedAt,
      };

      if (success) {
        ctx.pass({
          title: `Backup ok: ${row.PlanName ?? id}`,
          description: `Latest run succeeded and LastStart is within ${STALE_AFTER_DAYS} days.`,
          resourceType: 'backup-plan',
          resourceId: id,
          evidence,
        });
        continue;
      }

      ctx.fail({
        title: `Backup issue: ${row.PlanName ?? id}`,
        description: stale
          ? `Latest run is missing or older than ${STALE_AFTER_DAYS} days (LastStart=${row.LastStart ?? 'n/a'}).`
          : `Latest run status is ${String(row.Status)}${row.ErrorMessage ? `: ${row.ErrorMessage}` : ''}.`,
        resourceType: 'backup-plan',
        resourceId: id,
        severity: failed || stale ? 'high' : 'medium',
        remediation: stale
          ? 'Run the backup plan (or confirm it is still in scope). For a day-by-day file, export Reporting → Backup history → CSV.'
          : 'Open the detailed report in the management console, fix the plan error, and re-run.',
        evidence,
      });
    }
  },
};
