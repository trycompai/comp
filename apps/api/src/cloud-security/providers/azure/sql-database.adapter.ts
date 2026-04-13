import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface SqlServer {
  id: string;
  name: string;
  location: string;
  properties: {
    administratorLogin?: string;
    fullyQualifiedDomainName?: string;
    publicNetworkAccess?: string;
    minimalTlsVersion?: string;
  };
}

interface SqlFirewallRule {
  id: string;
  name: string;
  properties: {
    startIpAddress: string;
    endIpAddress: string;
  };
}

interface AuditingSetting {
  properties: {
    state: string;
    retentionDays?: number;
  };
}

const BASE = 'https://management.azure.com';

export class SqlDatabaseAdapter implements AzureServiceAdapter {
  readonly serviceId = 'sql-database';

  async scan({ accessToken, subscriptionId }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const servers = await fetchAllPages<SqlServer>(
      accessToken,
      `${BASE}/subscriptions/${subscriptionId}/providers/Microsoft.Sql/servers?api-version=2023-05-01-preview`,
    );

    if (servers.length === 0) return findings;

    for (const server of servers) {
      const props = server.properties;

      // Check 1: Public network access
      if (props.publicNetworkAccess === 'Enabled') {
        findings.push(this.finding(server, {
          key: 'public-access',
          title: `SQL Server Public Access Enabled: ${server.name}`,
          description: `SQL Server "${server.name}" allows public network access. Use private endpoints instead.`,
          severity: 'high',
          remediation: 'Disable public network access and configure private endpoint connections.',
        }));
      }

      // Check 2: TLS version
      if (!props.minimalTlsVersion || props.minimalTlsVersion < '1.2') {
        findings.push(this.finding(server, {
          key: 'tls-outdated',
          title: `Outdated TLS Version: ${server.name}`,
          description: `SQL Server "${server.name}" allows TLS versions below 1.2.`,
          severity: 'medium',
          remediation: 'Set minimum TLS version to 1.2.',
        }));
      }

      // Check 3: Auditing
      try {
        const resp = await fetch(
          `${BASE}${server.id}/auditingSettings/default?api-version=2021-11-01`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (resp.ok) {
          const data = (await resp.json()) as AuditingSetting;
          if (data.properties.state !== 'Enabled') {
            findings.push(this.finding(server, {
              key: 'auditing-disabled',
              title: `SQL Auditing Disabled: ${server.name}`,
              description: `SQL Server "${server.name}" does not have auditing enabled. Enable auditing to track database operations.`,
              severity: 'high',
              remediation: 'Enable SQL auditing in the server security settings.',
            }));
          }
        }
      } catch { /* skip if can't check */ }

      // Check 4: Firewall rules — check for "allow all Azure services" (0.0.0.0)
      try {
        const rules = await fetchAllPages<SqlFirewallRule>(
          accessToken,
          `${BASE}${server.id}/firewallRules?api-version=2023-05-01-preview`,
        );

        const allowAll = rules.find(
          (r) => r.properties.startIpAddress === '0.0.0.0' && r.properties.endIpAddress === '0.0.0.0',
        );
        if (allowAll) {
          findings.push(this.finding(server, {
            key: 'allow-azure-services',
            title: `SQL Allows All Azure Services: ${server.name}`,
            description: `SQL Server "${server.name}" has "Allow Azure services" enabled. This allows ANY Azure service (including other tenants) to connect.`,
            severity: 'medium',
            remediation: 'Remove the 0.0.0.0 rule and use specific VNet service endpoints or private endpoints.',
          }));
        }

        const wideOpen = rules.find(
          (r) => r.properties.startIpAddress === '0.0.0.0' && r.properties.endIpAddress === '255.255.255.255',
        );
        if (wideOpen) {
          findings.push(this.finding(server, {
            key: 'firewall-wide-open',
            title: `SQL Firewall Wide Open: ${server.name}`,
            description: `SQL Server "${server.name}" allows connections from any IP address.`,
            severity: 'critical',
            remediation: 'Remove the 0.0.0.0-255.255.255.255 rule and restrict to specific IPs.',
          }));
        }
      } catch { /* skip if can't check */ }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-sql-ok-${subscriptionId}`,
        title: 'SQL Database Security',
        description: `All ${servers.length} SQL Server(s) are properly configured.`,
        severity: 'info',
        resourceType: 'sql-server',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: { serviceId: this.serviceId, serviceName: 'SQL Database', findingKey: 'azure-sql-database-all-ok' },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private finding(server: SqlServer, opts: {
    key: string; title: string; description: string;
    severity: SecurityFinding['severity']; remediation: string;
  }): SecurityFinding {
    return {
      id: `azure-sql-${opts.key}-${server.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'sql-server',
      resourceId: server.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'SQL Database',
        findingKey: `azure-sql-database-${opts.key}`,
        serverName: server.name,
        location: server.location,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
