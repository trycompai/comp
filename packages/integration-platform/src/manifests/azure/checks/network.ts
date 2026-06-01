import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { ARM_BASE, armListAll, resolveAzureSubscriptionId } from './shared';

interface SecurityRule {
  name: string;
  properties: {
    direction: string;
    access: string;
    protocol: string;
    sourceAddressPrefix?: string;
    sourceAddressPrefixes?: string[];
    destinationPortRange?: string;
    destinationPortRanges?: string[];
    priority: number;
  };
}

interface Nsg {
  id: string;
  name: string;
  properties: { securityRules?: SecurityRule[] };
}

const DANGEROUS_DB_PORTS = new Set(['3306', '5432', '1433', '27017']);
const WILDCARD_SOURCES = new Set(['*', '0.0.0.0/0', 'Internet', 'Any']);

function ruleSources(r: SecurityRule): string[] {
  if (r.properties.sourceAddressPrefixes?.length) {
    return r.properties.sourceAddressPrefixes;
  }
  return r.properties.sourceAddressPrefix ? [r.properties.sourceAddressPrefix] : [];
}

function rulePorts(r: SecurityRule): string[] {
  if (r.properties.destinationPortRanges?.length) {
    return r.properties.destinationPortRanges;
  }
  return r.properties.destinationPortRange ? [r.properties.destinationPortRange] : [];
}

/** NSG inbound rules open to the internet on sensitive ports → Production Firewall / no public access. */
export const nsgNoOpenPortsCheck: IntegrationCheck = {
  id: 'azure-nsg-no-open-ports',
  name: 'Network — no NSG ports open to the internet',
  description:
    'Flags NSG inbound rules that allow SSH, RDP, database ports, or all ports from the internet.',
  service: 'network-watcher',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,
  run: async (ctx: CheckContext) => {
    const sub = await resolveAzureSubscriptionId(ctx);
    if (!sub) return;
    const nsgs = await armListAll<Nsg>(
      ctx,
      `${ARM_BASE}/subscriptions/${sub}/providers/Microsoft.Network/networkSecurityGroups?api-version=2023-11-01`,
    );
    if (nsgs.length === 0) return;

    for (const nsg of nsgs) {
      let violations = 0;
      const inbound = (nsg.properties.securityRules ?? []).filter(
        (r) =>
          r.properties.direction === 'Inbound' &&
          r.properties.access === 'Allow',
      );

      for (const rule of inbound) {
        if (!ruleSources(rule).some((s) => WILDCARD_SOURCES.has(s))) continue;
        const ports = rulePorts(rule);
        const conditions: Array<{ when: boolean; label: string; severity: FindingSeverity }> = [
          { when: ports.includes('*'), label: 'all ports', severity: 'critical' },
          { when: ports.includes('3389'), label: 'RDP (3389)', severity: 'critical' },
          {
            when: ports.some((p) => DANGEROUS_DB_PORTS.has(p)),
            label: 'database ports',
            severity: 'critical',
          },
          { when: ports.includes('22'), label: 'SSH (22)', severity: 'high' },
        ];
        for (const c of conditions) {
          if (c.when) {
            violations++;
            ctx.fail({
              title: `${c.label} open to internet: ${nsg.name}/${rule.name}`,
              description: `NSG "${nsg.name}" rule "${rule.name}" allows ${c.label} from the internet.`,
              resourceType: 'azure-nsg',
              resourceId: nsg.id,
              severity: c.severity,
              remediation:
                'Restrict the source to specific IP ranges, or use Azure Bastion / Private Link.',
              evidence: { nsg: nsg.name, rule: rule.name, priority: rule.properties.priority },
            });
          }
        }
      }

      if (violations === 0) {
        ctx.pass({
          title: `No open ports: ${nsg.name}`,
          description: `NSG "${nsg.name}" has no overly permissive inbound rules.`,
          resourceType: 'azure-nsg',
          resourceId: nsg.id,
          evidence: { nsg: nsg.name },
        });
      }
    }
  },
};
