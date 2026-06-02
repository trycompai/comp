import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAll, resolveAzureSubscriptionId } from './shared';

interface ActivityLogAlert {
  properties?: {
    enabled?: boolean;
    condition?: { allOf?: Array<{ field: string; equals: string }> };
  };
}

interface DiagnosticSetting {
  properties?: {
    workspaceId?: string;
    storageAccountId?: string;
    eventHubAuthorizationRuleId?: string;
    logs?: Array<{ enabled?: boolean }>;
  };
}

const RECOMMENDED_ALERTS = [
  { op: 'Microsoft.Authorization/policyAssignments/write', name: 'Policy assignment changes' },
  { op: 'Microsoft.Security/securitySolutions/write', name: 'Security solution changes' },
  { op: 'Microsoft.Network/networkSecurityGroups/write', name: 'NSG changes' },
  { op: 'Microsoft.Sql/servers/firewallRules/write', name: 'SQL firewall rule changes' },
];

/** Activity log alerts for critical ops + subscription log export → Monitoring & Alerting. */
export const monitorLoggingAlertingCheck: IntegrationCheck = {
  id: 'azure-monitor-logging-alerting',
  name: 'Azure Monitor — alerts and log export',
  description:
    'Verify activity log alerts exist for critical operations and subscription logs are exported.',
  service: 'monitor',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    let evaluated = false;

    const alerts = await armListAll<ActivityLogAlert>(
      ctx,
      `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Insights/activityLogAlerts?api-version=2020-10-01`,
    ).catch(() => null);
    if (alerts !== null) {
      evaluated = true;
      const ops = new Set<string>();
      for (const a of alerts) {
        if (!a.properties?.enabled) continue;
        for (const c of a.properties.condition?.allOf ?? []) {
          if (c.field === 'operationName') ops.add(c.equals);
        }
      }
      const missing = RECOMMENDED_ALERTS.filter((r) => !ops.has(r.op));
      if (missing.length > 0) {
        ctx.fail({
          title: `Missing activity log alerts (${missing.length})`,
          description: `No activity log alert configured for: ${missing.map((m) => m.name).join(', ')}.`,
          resourceType: 'azure-subscription',
          resourceId: sub,
          severity: 'medium',
          remediation:
            'Create activity log alerts in Azure Monitor for these critical operations.',
          evidence: { missing: missing.map((m) => m.op) },
        });
      } else {
        ctx.pass({
          title: 'Activity log alerts configured',
          description: 'All recommended activity log alerts are configured.',
          resourceType: 'azure-subscription',
          resourceId: sub,
          evidence: { recommended: RECOMMENDED_ALERTS.length },
        });
      }
    } else {
      // Alerts unreadable — fail rather than let the log-export half pass the
      // shared Monitoring task on incomplete evaluation.
      ctx.fail({
        title: 'Could not read activity log alerts',
        description:
          'Activity log alert coverage could not be read, so alerting was not verified.',
        resourceType: 'azure-subscription',
        resourceId: sub,
        severity: 'medium',
        remediation:
          'Grant Monitoring Reader (or Reader) so activity log alerts can be evaluated.',
        evidence: {},
      });
    }

    const diag = await ctx
      .fetch<{ value?: DiagnosticSetting[] }>(
        `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Insights/diagnosticSettings?api-version=2021-05-01-preview`,
      )
      .catch(() => null);
    if (diag !== null) {
      evaluated = true;
      const settings = diag.value ?? [];
      const hasExport = settings.some(
        (s) =>
          (s.properties?.workspaceId ||
            s.properties?.storageAccountId ||
            s.properties?.eventHubAuthorizationRuleId) &&
          (s.properties?.logs ?? []).some((l) => l.enabled),
      );
      if (hasExport) {
        ctx.pass({
          title: 'Diagnostic log export configured',
          description: 'Subscription activity logs are exported.',
          resourceType: 'azure-subscription',
          resourceId: sub,
          evidence: { settings: settings.length },
        });
      } else {
        ctx.fail({
          title: 'No diagnostic log export',
          description:
            'Subscription activity logs are not exported to Log Analytics, a storage account, or an event hub.',
          resourceType: 'azure-subscription',
          resourceId: sub,
          severity: 'medium',
          remediation:
            'Configure a diagnostic setting to export subscription activity logs.',
          evidence: {},
        });
      }
    }

    if (!evaluated) {
      ctx.log('Azure monitor check: could not read monitor data — skipping');
    }
  },
};
