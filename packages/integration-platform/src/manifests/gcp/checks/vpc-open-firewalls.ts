import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, FindingSeverity, IntegrationCheck } from '../../../types';
import { gcpListItems, portsCover, resolveGcpProjectIds } from './shared';

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
 * VPC firewall-rules check (direct API, no SCC). Flags enabled INGRESS VPC
 * firewall rules open to 0.0.0.0/0 that expose SSH (22), RDP (3389), or all
 * ports/protocols.
 *
 * Scope: this evaluates VPC firewall rules only (global/firewalls). It does NOT
 * evaluate hierarchical (org/folder) or network firewall policies, so the pass
 * evidence records `firewallPoliciesEvaluated: false` to avoid over-claiming.
 */
export const vpcOpenFirewallsCheck: IntegrationCheck = {
  id: 'gcp-vpc-no-open-firewalls',
  name: 'VPC — no firewall rules open to the internet',
  description:
    'Flags enabled INGRESS VPC firewall rules that allow 0.0.0.0/0 to SSH, RDP, or all ports. Evaluates VPC firewall rules only (not hierarchical/network firewall policies).',
  service: 'vpc-network',
  taskMapping: TASK_TEMPLATES.productionFirewallNopublicaccessControls,

  run: async (ctx: CheckContext) => {
    const projectIds = await resolveGcpProjectIds(ctx);
    if (projectIds.length === 0) {
      ctx.log('GCP VPC firewall check: no projects resolved — skipping');
      return;
    }

    for (const projectId of projectIds) {
      try {
        const rules = await gcpListItems<FirewallRule>(
          ctx,
          `https://compute.googleapis.com/compute/v1/projects/${encodeURIComponent(projectId)}/global/firewalls`,
        );

        let violations = 0;
        for (const rule of rules) {
          if (rule.disabled === true) continue;
          if (rule.direction && rule.direction !== 'INGRESS') continue;
          const srcs = rule.sourceRanges ?? [];
          const openRanges = srcs.filter((r) => r === '0.0.0.0/0' || r === '::/0');
          if (openRanges.length === 0) continue;
          const openLabel = openRanges.join(' / ');

          const allowed = rule.allowed ?? [];
          if (allowed.some((a) => a.IPProtocol === 'all')) {
            violations++;
            ctx.fail({
              title: `Firewall open to internet (all ports): ${rule.name}`,
              description: `Firewall rule "${rule.name}" allows ALL protocols/ports from ${openLabel}.`,
              resourceType: 'gcp-firewall-rule',
              resourceId: `${projectId}/${rule.name}`,
              severity: 'critical',
              remediation: `Remove the public source range(s) (${openLabel}); restrict source ranges to known CIDRs and limit allowed protocols/ports to only what is required.`,
              evidence: { projectId, rule: rule.name, openRanges },
            });
            continue;
          }

          const tcpTuples = allowed.filter(
            (a) => a.IPProtocol === 'tcp' || a.IPProtocol === '6',
          );
          for (const { port, label, severity } of SENSITIVE_PORTS) {
            if (tcpTuples.some((t) => portsCover(t.ports, port))) {
              violations++;
              ctx.fail({
                title: `${label} open to internet: ${rule.name}`,
                description: `Firewall rule "${rule.name}" allows ${label} (port ${port}) from ${openLabel}.`,
                resourceType: 'gcp-firewall-rule',
                resourceId: `${projectId}/${rule.name}`,
                severity,
                remediation: `Remove the public source range(s) (${openLabel}) for port ${port}; restrict ${label} access to a VPN, bastion, or known CIDR ranges.`,
                evidence: { projectId, rule: rule.name, port, openRanges },
              });
            }
          }
        }

        if (violations === 0) {
          // Zero ingress rules = implied-deny = compliant, so a project with no
          // firewall rules passes (ruleCount 0) rather than being skipped.
          ctx.pass({
            title: 'No VPC firewall rules open to the internet',
            description: `No VPC firewall rule in "${projectId}" exposes SSH/RDP/all-ports to 0.0.0.0/0 (${rules.length} rule(s) checked). Scope: VPC firewall rules only — hierarchical/network firewall policies were not evaluated.`,
            resourceType: 'gcp-project',
            resourceId: projectId,
            evidence: {
              projectId,
              ruleCount: rules.length,
              scope: 'vpc-firewall-rules-only',
              firewallPoliciesEvaluated: false,
            },
          });
        }
      } catch (err) {
        ctx.warn('GCP VPC firewall check failed for project; skipping', {
          projectId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  },
};
