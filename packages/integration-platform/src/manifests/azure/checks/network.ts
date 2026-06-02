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

const DB_PORTS = [3306, 5432, 1433, 27017];
const WILDCARD_SOURCES = new Set(['*', '0.0.0.0/0', '::/0', 'Internet', 'Any']);
const MAX_PORT = 65535;

/** True if an NSG port token ('22', '20-30', '*') covers any of the target ports. */
function portTokenCoversAny(token: string, targets: number[]): boolean {
  if (token === '*') return true;
  const [loStr, hiStr] = token.split('-');
  const lo = Number(loStr);
  const hi = hiStr === undefined ? lo : Number(hiStr);
  if (Number.isNaN(lo) || Number.isNaN(hi)) return false;
  return targets.some((t) => t >= lo && t <= hi);
}
function portsCoverAny(ports: string[], targets: number[]): boolean {
  return ports.some((tok) => portTokenCoversAny(tok, targets));
}

/**
 * True if an NSG port token represents "all ports": either the '*' wildcard or
 * a numeric range spanning the full port space (e.g. '0-65535' or '1-65535').
 */
function portTokenIsAllPorts(token: string): boolean {
  if (token === '*') return true;
  const [loStr, hiStr] = token.split('-');
  if (hiStr === undefined) return false;
  const lo = Number(loStr);
  const hi = Number(hiStr);
  if (Number.isNaN(lo) || Number.isNaN(hi)) return false;
  return lo <= 1 && hi >= MAX_PORT;
}
function portsCoverAllPorts(ports: string[]): boolean {
  return ports.some((tok) => portTokenIsAllPorts(tok));
}

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
        // SSH/RDP/DB are TCP services — only flag them on TCP or any-protocol
        // rules. "All ports" exposure applies to any protocol.
        const proto = (rule.properties.protocol ?? '*').toLowerCase();
        const tcpish = proto === '*' || proto === 'tcp';
        const conditions: Array<{ when: boolean; label: string; severity: FindingSeverity }> = [
          { when: portsCoverAllPorts(ports), label: 'all ports', severity: 'critical' },
          { when: tcpish && portsCoverAny(ports, [3389]), label: 'RDP (3389)', severity: 'critical' },
          { when: tcpish && portsCoverAny(ports, DB_PORTS), label: 'database ports', severity: 'critical' },
          { when: tcpish && portsCoverAny(ports, [22]), label: 'SSH (22)', severity: 'high' },
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
