import type { SecurityFinding } from '../../cloud-security.service';
import type { AzureServiceAdapter } from './azure-service-adapter';
import { fetchAllPages } from './azure-service-adapter';

interface NetworkSecurityGroup {
  id: string;
  name: string;
  location: string;
  properties: {
    securityRules: SecurityRule[];
  };
}

interface SecurityRule {
  name: string;
  properties: {
    direction: 'Inbound' | 'Outbound';
    access: 'Allow' | 'Deny';
    protocol: string;
    sourceAddressPrefix?: string;
    sourceAddressPrefixes?: string[];
    destinationPortRange?: string;
    destinationPortRanges?: string[];
    priority: number;
  };
}

const DANGEROUS_PORTS = new Set([
  '22',
  '3389',
  '3306',
  '5432',
  '1433',
  '27017',
]);
const WILDCARD_SOURCES = new Set(['*', '0.0.0.0/0', 'Internet', 'Any']);

export class NetworkWatcherAdapter implements AzureServiceAdapter {
  readonly serviceId = 'network-watcher';

  async scan({
    accessToken,
    subscriptionId,
  }: {
    accessToken: string;
    subscriptionId: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const baseUrl = 'https://management.azure.com';

    const nsgs = await fetchAllPages<NetworkSecurityGroup>(
      accessToken,
      `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Network/networkSecurityGroups?api-version=2023-11-01`,
    );

    if (nsgs.length === 0) return findings;

    for (const nsg of nsgs) {
      const inboundAllows = nsg.properties.securityRules.filter(
        (r) =>
          r.properties.direction === 'Inbound' &&
          r.properties.access === 'Allow',
      );

      for (const rule of inboundAllows) {
        const sources = this.getSources(rule);
        const ports = this.getPorts(rule);
        const isWildcard = sources.some((s) => WILDCARD_SOURCES.has(s));

        if (!isWildcard) continue;

        // Check 1: SSH open to internet
        if (ports.includes('22')) {
          findings.push(
            this.finding(nsg, rule, {
              key: 'ssh-open',
              title: `SSH Open to Internet: ${nsg.name}/${rule.name}`,
              description: `NSG "${nsg.name}" allows SSH (port 22) from the internet. Restrict to specific IP ranges or use a bastion host.`,
              severity: 'high',
              remediation:
                'Restrict source address to specific IPs or use Azure Bastion for SSH access.',
            }),
          );
        }

        // Check 2: RDP open to internet
        if (ports.includes('3389')) {
          findings.push(
            this.finding(nsg, rule, {
              key: 'rdp-open',
              title: `RDP Open to Internet: ${nsg.name}/${rule.name}`,
              description: `NSG "${nsg.name}" allows RDP (port 3389) from the internet. This is a common attack vector.`,
              severity: 'critical',
              remediation:
                'Restrict source address to specific IPs or use Azure Bastion for RDP access.',
            }),
          );
        }

        // Check 3: Database ports open to internet
        const openDbPorts = ports.filter(
          (p) => DANGEROUS_PORTS.has(p) && p !== '22' && p !== '3389',
        );
        if (openDbPorts.length > 0) {
          findings.push(
            this.finding(nsg, rule, {
              key: 'db-ports-open',
              title: `Database Ports Open to Internet: ${nsg.name}/${rule.name}`,
              description: `NSG "${nsg.name}" exposes database ports (${openDbPorts.join(', ')}) to the internet.`,
              severity: 'critical',
              remediation:
                'Restrict database access to private networks only. Use Private Link for database connections.',
            }),
          );
        }

        // Check 4: All ports open to internet
        if (
          ports.includes('*') ||
          rule.properties.destinationPortRange === '*'
        ) {
          findings.push(
            this.finding(nsg, rule, {
              key: 'all-ports-open',
              title: `All Ports Open to Internet: ${nsg.name}/${rule.name}`,
              description: `NSG "${nsg.name}" allows all ports from the internet. This effectively bypasses network security.`,
              severity: 'critical',
              remediation:
                'Replace with specific port rules following least-privilege principle.',
            }),
          );
        }
      }
    }

    if (findings.length === 0) {
      findings.push({
        id: `azure-nsg-ok-${subscriptionId}`,
        title: 'Network Security Groups',
        description: `All ${nsgs.length} NSG(s) have no overly permissive inbound rules.`,
        severity: 'info',
        resourceType: 'nsg',
        resourceId: subscriptionId,
        remediation: 'No action needed.',
        evidence: {
          serviceId: this.serviceId,
          serviceName: 'Network Watcher',
          findingKey: 'azure-network-watcher-all-ok',
        },
        createdAt: new Date().toISOString(),
        passed: true,
      });
    }

    return findings;
  }

  private getSources(rule: SecurityRule): string[] {
    if (rule.properties.sourceAddressPrefixes?.length) {
      return rule.properties.sourceAddressPrefixes;
    }
    return rule.properties.sourceAddressPrefix
      ? [rule.properties.sourceAddressPrefix]
      : [];
  }

  private getPorts(rule: SecurityRule): string[] {
    if (rule.properties.destinationPortRanges?.length) {
      return rule.properties.destinationPortRanges;
    }
    return rule.properties.destinationPortRange
      ? [rule.properties.destinationPortRange]
      : [];
  }

  private finding(
    nsg: NetworkSecurityGroup,
    rule: SecurityRule,
    opts: {
      key: string;
      title: string;
      description: string;
      severity: SecurityFinding['severity'];
      remediation: string;
    },
  ): SecurityFinding {
    return {
      id: `azure-nw-${opts.key}-${nsg.name}-${rule.name}`,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'nsg',
      resourceId: nsg.id,
      remediation: opts.remediation,
      evidence: {
        serviceId: this.serviceId,
        serviceName: 'Network Watcher',
        findingKey: `azure-network-watcher-${opts.key}`,
        nsgName: nsg.name,
        ruleName: rule.name,
        priority: rule.properties.priority,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
