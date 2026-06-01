import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAll, resolveAzureSubscriptionId } from './shared';

interface SqlServer {
  id: string;
  name: string;
  properties?: {
    publicNetworkAccess?: string;
    minimalTlsVersion?: string;
  };
}

interface SqlFirewallRule {
  properties: { startIpAddress: string; endIpAddress: string };
}

async function listSqlServers(
  ctx: CheckContext,
  sub: string,
): Promise<SqlServer[]> {
  return armListAll<SqlServer>(
    ctx,
    `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Sql/servers?api-version=2023-05-01-preview`,
  );
}

/** SQL Server minimum TLS 1.2 → TLS / HTTPS. */
export const sqlTlsCheck: IntegrationCheck = {
  id: 'azure-sql-tls',
  name: 'SQL Database — TLS 1.2 enforced',
  description: 'Verify SQL Servers require a minimum TLS version of 1.2.',
  service: 'sql-database',
  taskMapping: TASK_TEMPLATES.tlsHttps,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const servers = await listSqlServers(ctx, sub);
    if (servers.length === 0) return;
    for (const s of servers) {
      const tls = s.properties?.minimalTlsVersion;
      if (!tls || tls < '1.2') {
        ctx.fail({
          title: `Outdated TLS version: ${s.name}`,
          description: `SQL Server "${s.name}" allows TLS versions below 1.2 (current: ${tls ?? 'unset'}).`,
          resourceType: 'azure-sql-server',
          resourceId: s.id,
          severity: 'medium',
          remediation: 'Set the minimum TLS version to 1.2.',
          evidence: { server: s.name, minimalTlsVersion: tls ?? null },
        });
      } else {
        ctx.pass({
          title: `TLS 1.2 enforced: ${s.name}`,
          description: `SQL Server "${s.name}" requires TLS >= 1.2.`,
          resourceType: 'azure-sql-server',
          resourceId: s.id,
          evidence: { server: s.name, minimalTlsVersion: tls },
        });
      }
    }
  },
};

/** SQL Server no public network / wide-open firewall → Production Firewall / no public access. */
export const sqlPublicAccessCheck: IntegrationCheck = {
  id: 'azure-sql-no-public-access',
  name: 'SQL Database — no public access',
  description:
    'Verify SQL Servers disable public network access and have no wide-open firewall rules.',
  service: 'sql-database',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const servers = await listSqlServers(ctx, sub);
    if (servers.length === 0) return;
    for (const s of servers) {
      let violation: { title: string; severity: 'high' | 'critical' | 'medium'; detail: string } | null =
        null;

      if (s.properties?.publicNetworkAccess === 'Enabled') {
        violation = {
          title: `SQL public network access enabled: ${s.name}`,
          severity: 'high',
          detail: 'allows public network access',
        };
      }

      const rules = await armListAll<SqlFirewallRule>(
        ctx,
        `${ARM_BASE}${s.id}/firewallRules?api-version=2023-05-01-preview`,
      ).catch(() => [] as SqlFirewallRule[]);

      const wideOpen = rules.find(
        (r) =>
          r.properties.startIpAddress === '0.0.0.0' &&
          r.properties.endIpAddress === '255.255.255.255',
      );
      const allowAllAzure = rules.find(
        (r) =>
          r.properties.startIpAddress === '0.0.0.0' &&
          r.properties.endIpAddress === '0.0.0.0',
      );
      if (wideOpen) {
        violation = {
          title: `SQL firewall wide open: ${s.name}`,
          severity: 'critical',
          detail: 'allows connections from any IP (0.0.0.0–255.255.255.255)',
        };
      } else if (!violation && allowAllAzure) {
        violation = {
          title: `SQL allows all Azure services: ${s.name}`,
          severity: 'medium',
          detail: 'has the "Allow Azure services" (0.0.0.0) rule',
        };
      }

      if (violation) {
        ctx.fail({
          title: violation.title,
          description: `SQL Server "${s.name}" ${violation.detail}.`,
          resourceType: 'azure-sql-server',
          resourceId: s.id,
          severity: violation.severity,
          remediation:
            'Disable public network access and use private endpoints; remove 0.0.0.0 firewall rules.',
          evidence: { server: s.name, publicNetworkAccess: s.properties?.publicNetworkAccess ?? null },
        });
      } else {
        ctx.pass({
          title: `No public access: ${s.name}`,
          description: `SQL Server "${s.name}" restricts public network access and has no wide-open firewall rules.`,
          resourceType: 'azure-sql-server',
          resourceId: s.id,
          evidence: { server: s.name, firewallRuleCount: rules.length },
        });
      }
    }
  },
};

interface AuditingSetting {
  properties?: { state?: string };
}

/** SQL Server auditing enabled → Monitoring & Alerting. */
export const sqlAuditingCheck: IntegrationCheck = {
  id: 'azure-sql-auditing',
  name: 'SQL Database — auditing enabled',
  description: 'Verify SQL Servers have auditing enabled to track database operations.',
  service: 'sql-database',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const servers = await listSqlServers(ctx, sub);
    if (servers.length === 0) return;
    for (const s of servers) {
      const auditing = await ctx
        .fetch<AuditingSetting>(
          `${ARM_BASE}${s.id}/auditingSettings/default?api-version=2021-11-01`,
        )
        .catch(() => null);
      if (auditing === null) continue; // couldn't read — don't assert pass/fail
      if (auditing.properties?.state === 'Enabled') {
        ctx.pass({
          title: `Auditing enabled: ${s.name}`,
          description: `SQL Server "${s.name}" has auditing enabled.`,
          resourceType: 'azure-sql-server',
          resourceId: s.id,
          evidence: { server: s.name },
        });
      } else {
        ctx.fail({
          title: `Auditing disabled: ${s.name}`,
          description: `SQL Server "${s.name}" does not have auditing enabled.`,
          resourceType: 'azure-sql-server',
          resourceId: s.id,
          severity: 'high',
          remediation: 'Enable SQL auditing in the server security settings.',
          evidence: { server: s.name, state: auditing.properties?.state ?? null },
        });
      }
    }
  },
};
