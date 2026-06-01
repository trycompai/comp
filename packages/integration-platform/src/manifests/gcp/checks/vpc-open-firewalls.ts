import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { portsCover, resolveGcpProjectIds } from './shared';

interface FirewallRule {
  name: string;
  direction?: string;
  disabled?: boolean;
  sourceRanges?: string[];
  allowed?: Array<{ IPProtocol: string; ports?: string[] }>;
}

const SENSITIVE_PORTS: Array<{
  port: number;
  label: string;
  severity: FindingSeverity;
}> = [
  { port: 3389, label: 'RDP', severity: 'critical' },
  { port: 22, label: 'SSH', severity: 'high' },
];

/**
 * VPC firewall check (direct API, no SCC). Flags enabled INGRESS firewall rules
 * open to 0.0.0.0/0 that expose SSH (22), RDP (3389), or all ports/protocols.
 */
export const vpcOpenFirewallsCheck: IntegrationCheck = {
  id: 'gcp-vpc-no-open-firewalls',
  name: 'VPC — no firewalls open to the internet',
  description:
    'Flags enabled INGRESS firewall rules that allow 0.0.0.0/0 to SSH, RDP, or all ports.',
  service: 'vpc-network',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP VPC firewall check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      const data = await ctx.fetch<{ items?: FirewallRule[] }>(
        `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(projectId)}/global/firewalls`,
      );
      const rules = data.items ?? [];
      if (rules.length === 0) continue;

      let violations = 0;
      for (const rule of rules) {
        if (rule.disabled === true) continue;
        if (rule.direction && rule.direction !== 'INGRESS') continue;
        if (!(rule.sourceRanges ?? []).includes('0.0.0.0/0')) continue;

        const allowed = rule.allowed ?? [];
        if (allowed.some((a) => a.IPProtocol === 'all')) {
          violations++;
          ctx.fail({
            title: `Firewall open to internet (all ports): ${rule.name}`,
            description: `Firewall rule "${rule.name}" allows ALL protocols/ports from 0.0.0.0/0.`,
            resourceType: 'gcp-firewall-rule',
            resourceId: rule.name,
            severity: 'critical',
            remediation:
              'Restrict source ranges to known CIDRs and limit allowed protocols/ports to only what is required.',
            evidence: { projectId, rule: rule.name },
          });
          continue;
        }

        const tcp = allowed.find(
          (a) => a.IPProtocol === 'tcp' || a.IPProtocol === '6',
        );
        for (const { port, label, severity } of SENSITIVE_PORTS) {
          if (tcp && portsCover(tcp.ports, port)) {
            violations++;
            ctx.fail({
              title: `${label} open to internet: ${rule.name}`,
              description: `Firewall rule "${rule.name}" allows ${label} (port ${port}) from 0.0.0.0/0.`,
              resourceType: 'gcp-firewall-rule',
              resourceId: rule.name,
              severity,
              remediation: `Remove the 0.0.0.0/0 source for port ${port}; restrict ${label} access to a VPN, bastion, or known CIDR ranges.`,
              evidence: { projectId, rule: rule.name, port },
            });
          }
        }
      }

      if (violations === 0) {
        ctx.pass({
          title: 'No firewalls open to the internet',
          description: `No firewall rule in "${projectId}" exposes SSH/RDP/all-ports to 0.0.0.0/0 (${rules.length} rule(s) checked).`,
          resourceType: 'gcp-project',
          resourceId: projectId,
          evidence: { projectId, ruleCount: rules.length },
        });
      }
    }
  },
};
