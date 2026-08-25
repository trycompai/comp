import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { fetchAllStat, hidOf, hostName, rmmToken } from '../client';
import type { RmmRecord } from '../types';

function alertsOf(row: RmmRecord): unknown {
  return (
    row.alerts ??
    row.Alerts ??
    row.activeAlerts ??
    row.ActiveAlerts ??
    row.recentAlerts ??
    row.RecentAlerts ??
    null
  );
}

export const monitoringAlertingCheck: IntegrationCheck = {
  id: 'monitoring-alerting',
  name: 'MSP360 RMM monitoring and alerting',
  description:
    'Fleet summary stats (alerts refresh ~every 10 minutes). Open alerts are attached as evidence; they do not automatically fail this task.',
  service: 'monitoring',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,

  run: async (ctx: CheckContext) => {
    ctx.log('Starting MSP360 RMM monitoring-alerting check');
    if (!rmmToken(ctx)) {
      ctx.fail({
        title: 'Missing MSP360 RMM API token',
        description: 'Monitoring evidence needs the RMM Bearer token.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm',
        severity: 'high',
        remediation: 'Add an RMM API token for a licensed administrator.',
      });
      return;
    }

    let summaries: RmmRecord[];
    try {
      summaries = await fetchAllStat(ctx, 'summary');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail({
        title: 'MSP360 RMM summary endpoint failed',
        description: 'GET computers/stat/summary/latest was empty or unauthorized — no monitoring evidence.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-summary',
        severity: 'high',
        remediation: 'Confirm the token can read summary stats. Community Edition has no API.',
        evidence: { error: message },
      });
      return;
    }

    if (summaries.length === 0) {
      ctx.fail({
        title: 'MSP360 RMM summary returned no rows',
        description: 'No fleet summary/alerts payload. Treated as monitoring not configured for this connection.',
        resourceType: 'connection',
        resourceId: 'msp360-rmm-summary',
        severity: 'medium',
        remediation: 'Ensure RMM agents are reporting and the token is not scoped to an empty company.',
      });
      return;
    }

    const checkedAt = new Date().toISOString();
    ctx.pass({
      title: 'MSP360 RMM fleet summary reachable',
      description: `Summary endpoint returned ${summaries.length} row(s). Open alerts are evidence, not an automatic fail of this compliance task.`,
      resourceType: 'service',
      resourceId: 'msp360-rmm-monitoring',
      evidence: { rowCount: summaries.length, checkedAt },
    });

    for (const [index, row] of summaries.entries()) {
      const hid = hidOf(row, `summary-${index}`);
      const name = hostName(row, hid);
      ctx.pass({
        title: `RMM summary: ${name}`,
        description: 'Current summary/alerts snapshot from MSP360 RMM.',
        resourceType: 'device',
        resourceId: hid,
        evidence: {
          hid,
          name,
          alerts: alertsOf(row),
          antivirus: row.antivirus ?? row.Antivirus ?? row.avStatus,
          patches: row.patches ?? row.Patches ?? row.updateStatus,
          smart: row.smart ?? row.SMART ?? row.hddSmart,
          cpu: row.cpu ?? row.CpuUsage,
          memory: row.memory ?? row.MemoryUsage,
          disk: row.disk ?? row.DiskUsage,
          raw: row,
          checkedAt,
        },
      });
    }
  },
};
