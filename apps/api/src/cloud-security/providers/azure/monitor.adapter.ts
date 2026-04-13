import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface ActivityLogAlert {
  id: string;
  name: string;
  properties: {
    enabled: boolean;
    description?: string;
    condition?: {
      allOf?: Array<{ field: string; equals: string }>;
    };
  };
}

interface DiagnosticSetting {
  id: string;
  name: string;
  properties: {
    logs: Array<{ enabled: boolean; category?: string }>;
    workspaceId?: string;
    storageAccountId?: string;
    eventHubAuthorizationRuleId?: string;
  };
}

/** Critical operations that should have activity log alerts. */
const RECOMMENDED_ALERTS = [
  { operation: 'Microsoft.Authorization/policyAssignments/write', name: 'Policy assignment changes' },
  { operation: 'Microsoft.Security/securitySolutions/write', name: 'Security solution changes' },
  { operation: 'Microsoft.Network/networkSecurityGroups/write', name: 'NSG changes' },
  { operation: 'Microsoft.Sql/servers/firewallRules/write', name: 'SQL firewall rule changes' },
];

export class MonitorAdapter implements AzureServiceAdapter {
  readonly serviceId = 'monitor';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const baseUrl = 'https://management.azure.com';

    // Check 1: Activity log alerts for critical operations
    try {
      const alerts = await fetchAllPages<ActivityLogAlert>(
        accessToken,
        `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Insights/activityLogAlerts?api-version=2020-10-01`,
      );

      const enabledAlerts = alerts.filter((a) => a.properties.enabled);
      const alertOperations = new Set<string>();

      for (const alert of enabledAlerts) {
        const conditions = alert.properties.condition?.allOf ?? [];
        for (const c of conditions) {
          if (c.field === 'operationName') {
            alertOperations.add(c.equals);
          }
        }
      }

      for (const rec of RECOMMENDED_ALERTS) {
        const hasAlert = alertOperations.has(rec.operation);
        if (!hasAlert) {
          findings.push({
            id: `azure-monitor-missing-alert-${rec.operation}`,
            title: `Missing Activity Log Alert: ${rec.name}`,
            description: `No activity log alert is configured for "${rec.operation}". Critical operations should trigger alerts.`,
            severity: 'medium',
            resourceType: 'activity-log-alert',
            resourceId: subscriptionId,
            remediation: `Create an activity log alert for operation "${rec.operation}" in Azure Monitor.`,
            evidence: {
              serviceId: this.serviceId,
              serviceName: 'Azure Monitor',
              findingKey: `azure-monitor-missing-alert-${rec.operation.split('/').pop()}`,
              operation: rec.operation,
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (findings.length === 0) {
        findings.push({
          id: `azure-monitor-alerts-ok-${subscriptionId}`,
          title: 'Activity Log Alerts',
          description: 'All recommended activity log alerts are configured.',
          severity: 'info',
          resourceType: 'activity-log-alert',
          resourceId: subscriptionId,
          remediation: 'No action needed.',
          evidence: { serviceId: this.serviceId, serviceName: 'Azure Monitor', findingKey: 'azure-monitor-alerts-ok' },
          createdAt: new Date().toISOString(),
          passed: true,
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('403') || msg.includes('AuthorizationFailed')) {
        findings.push({
          id: `azure-monitor-permission-${subscriptionId}`,
          title: 'Unable to Access Activity Log Alerts',
          description: 'The service principal does not have permission to read activity log alerts.',
          severity: 'medium',
          resourceType: 'activity-log-alert',
          resourceId: subscriptionId,
          remediation: 'Assign the "Monitoring Reader" role to your App Registration.',
          evidence: { serviceId: this.serviceId, serviceName: 'Azure Monitor', findingKey: 'azure-monitor-permission', error: msg },
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Check 2: Subscription-level diagnostic settings
    try {
      const response = await fetch(
        `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Insights/diagnosticSettings?api-version=2021-05-01-preview`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        const data = (await response.json()) as { value: DiagnosticSetting[] };
        const settings = data.value ?? [];

        // Log what Azure returns so we can debug scan vs fix mismatches
        if (settings.length > 0) {
          for (const s of settings) {
            console.log(`[AzureMonitor] Diagnostic setting "${s.name}": workspaceId=${s.properties.workspaceId ?? 'none'}, storageAccountId=${s.properties.storageAccountId ?? 'none'}, eventHub=${s.properties.eventHubAuthorizationRuleId ?? 'none'}, logs=${JSON.stringify(s.properties.logs?.filter((l) => l.enabled).map((l) => l.category))}`);
          }
        } else {
          console.log('[AzureMonitor] No diagnostic settings found on subscription');
        }

        const hasLogExport = settings.some((s) =>
          s.properties.workspaceId || s.properties.storageAccountId || s.properties.eventHubAuthorizationRuleId,
        );

        if (!hasLogExport) {
          findings.push({
            id: `azure-monitor-no-diag-${subscriptionId}`,
            title: 'No Diagnostic Log Export Configured',
            description: 'Subscription activity logs are not exported to a Log Analytics workspace, storage account, or event hub.',
            severity: 'medium',
            resourceType: 'diagnostic-settings',
            resourceId: subscriptionId,
            remediation: 'Configure a diagnostic setting to export activity logs to Log Analytics or a storage account.',
            evidence: {
              serviceId: this.serviceId,
              serviceName: 'Azure Monitor',
              findingKey: 'azure-monitor-no-diagnostic-export',
            },
            createdAt: new Date().toISOString(),
          });
        } else {
          findings.push({
            id: `azure-monitor-diag-ok-${subscriptionId}`,
            title: 'Diagnostic Log Export',
            description: 'Subscription activity logs are being exported.',
            severity: 'info',
            resourceType: 'diagnostic-settings',
            resourceId: subscriptionId,
            remediation: 'No action needed.',
            evidence: { serviceId: this.serviceId, serviceName: 'Azure Monitor', findingKey: 'azure-monitor-diagnostic-export-ok' },
            createdAt: new Date().toISOString(),
            passed: true,
          });
        }
      }
    } catch {
      // Non-critical — skip diagnostic settings check
    }

    return findings;
  }
}
