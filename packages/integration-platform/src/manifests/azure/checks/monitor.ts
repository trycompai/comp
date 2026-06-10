import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  remediationForReadFailure,
  toHttpReadFailure,
  type ReadFailure,
} from '../../http-read-failure';
import { ARM_BASE, armListAll, resolveAzureSubscriptionIds } from './shared';

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
async function runMonitorLoggingAlertingForSubscription(ctx: CheckContext, sub: string): Promise<void> {
    let evaluated = false;

    let alertsReadFailure: ReadFailure | undefined;
    const alerts = await armListAll<ActivityLogAlert>(
      ctx,
      `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Insights/activityLogAlerts?api-version=2020-10-01`,
    ).catch((err) => {
      alertsReadFailure = toHttpReadFailure(err);
      ctx.log(`Azure Monitor: activity log alerts read failed — ${alertsReadFailure.error}`);
      return null;
    });
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
          evidence: {
            recommended: RECOMMENDED_ALERTS.map((r) => r.op),
            configuredOperations: [...ops],
          },
        });
      }
    } else {
      // Alerts unreadable — fail rather than let the log-export half pass the
      // shared Monitoring task on incomplete evaluation.
      ctx.fail({
        title: 'Could not read activity log alerts',
        description: `Activity log alert coverage could not be read${alertsReadFailure ? ` (${alertsReadFailure.error})` : ''}, so alerting was not verified.`,
        resourceType: 'azure-subscription',
        resourceId: sub,
        severity: 'medium',
        remediation: remediationForReadFailure(
          alertsReadFailure,
          'Grant Monitoring Reader (or Reader) so activity log alerts can be evaluated.',
        ),
        evidence: alertsReadFailure ? { readError: alertsReadFailure.error } : {},
      });
    }

    let diagReadFailure: ReadFailure | undefined;
    const diag = await ctx
      .fetch<{ value?: DiagnosticSetting[] }>(
        `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Insights/diagnosticSettings?api-version=2021-05-01-preview`,
      )
      .catch((err) => {
        diagReadFailure = toHttpReadFailure(err);
        ctx.log(`Azure Monitor: diagnostic settings read failed — ${diagReadFailure.error}`);
        return null;
      });
    if (diag !== null) {
      evaluated = true;
      const settings = diag.value ?? [];
      // A setting only exports when it targets a destination AND has at least
      // one enabled log category. Reuse this for both the verdict and the
      // evidence so the destination flags reflect what actually exports (a
      // destination whose logs are disabled must not be reported as exporting).
      const hasEnabledLogs = (s: DiagnosticSetting) =>
        (s.properties?.logs ?? []).some((l) => l.enabled);
      const hasExport = settings.some(
        (s) =>
          (s.properties?.workspaceId ||
            s.properties?.storageAccountId ||
            s.properties?.eventHubAuthorizationRuleId) &&
          hasEnabledLogs(s),
      );
      if (hasExport) {
        ctx.pass({
          title: 'Diagnostic log export configured',
          description: 'Subscription activity logs are exported.',
          resourceType: 'azure-subscription',
          resourceId: sub,
          evidence: {
            settingsCount: settings.length,
            exportsToLogAnalytics: settings.some(
              (s) => !!s.properties?.workspaceId && hasEnabledLogs(s),
            ),
            exportsToStorage: settings.some(
              (s) => !!s.properties?.storageAccountId && hasEnabledLogs(s),
            ),
            exportsToEventHub: settings.some(
              (s) => !!s.properties?.eventHubAuthorizationRuleId && hasEnabledLogs(s),
            ),
          },
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
          evidence: { diagnosticSettingsFound: settings.length },
        });
      }
    } else {
      // Diagnostic settings unreadable — fail rather than let the alerting half
      // pass the shared Monitoring task on incomplete evaluation.
      ctx.fail({
        title: 'Could not read diagnostic settings',
        description: `Subscription diagnostic settings could not be read${diagReadFailure ? ` (${diagReadFailure.error})` : ''}, so log export was not verified.`,
        resourceType: 'azure-subscription',
        resourceId: sub,
        severity: 'medium',
        remediation: remediationForReadFailure(
          diagReadFailure,
          'Grant Monitoring Reader (or Reader) so diagnostic settings can be evaluated.',
        ),
        evidence: diagReadFailure ? { readError: diagReadFailure.error } : {},
      });
    }

    if (!evaluated) {
      ctx.log('Azure monitor check: could not read monitor data — skipping');
    }
}

export const monitorLoggingAlertingCheck: IntegrationCheck = {
  id: 'azure-monitor-logging-alerting',
  name: 'Azure Monitor — alerts and log export',
  description:
    'Verify activity log alerts exist for critical operations and subscription logs are exported.',
  service: 'monitor',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  run: async (ctx: CheckContext) => {
    const subs = await resolveAzureSubscriptionIds(ctx);
    for (const sub of subs) {
      await runMonitorLoggingAlertingForSubscription(ctx, sub);
    }
  },
};
